import type { CheckoutRequest, CheckoutResult, EmitTrace, Kernel as KernelIntegration, VerifiedOffer } from "@buyer/contract";
import { Kernel } from "@onkernel/sdk";
import { checkPageTotal, nextCheckoutStep } from "./checkout-guard";
import { env } from "./env";
import { adapterFor, verifyScript } from "./merchants";
import { parseMoneyToCents, extractPriceFromHtml } from "./price";
import { emitFallback, errorMessage, safeEmit, shortHash, traced } from "./trace";

/** How long a review-mode browser stays open after reaching the review page, so the live view can be watched. */
const REVIEW_HOLD_MS = Number(process.env.KERNEL_REVIEW_HOLD_MS ?? 10_000);

export function createKernel(): KernelIntegration {
  // Scope lock: do not verify in a browser, open a live view, or pay. The Kernel client
  // below stays in this file and is not called.
  return {
    verifyOffer: (url, emit) => fallbackVerifyOffer(url, emit, "Kernel client unused: offers are links and are not browser-verified"),
    checkout: (req, emit) => fallbackCheckout(req, emit),
  };
}

let client: Kernel | undefined;
let fillClient: Kernel | undefined;
const kernelClient = () => (client ??= new Kernel({ apiKey: env.kernelApiKey() }));
/** KERNEL fill must not be retried automatically: a lost response can follow successful writes. */
const kernelFillClient = () => (fillClient ??= new Kernel({ apiKey: env.kernelApiKey(), maxRetries: 0 }));

export function fallbackVerifyOffer(url: string, emit: EmitTrace, reason: string): Promise<VerifiedOffer> {
  emitFallback(emit, "kernel", "verify offer", reason, { url });
  return Promise.resolve({
    url,
    title: `Not verified (Kernel unavailable): ${hostOf(url)}`,
    priceCents: null,
    inStock: false,
    kernelSessionId: `fallback-${shortHash(url)}`,
    replayUrl: null,
    usingFallback: true,
  });
}

export function fallbackCheckout(req: CheckoutRequest, emit: EmitTrace): Promise<CheckoutResult> {
  emitFallback(emit, "kernel", `checkout (${req.mode})`, "Kernel client unused: no browser started, nothing purchased", {
    url: req.url,
  });
  return Promise.resolve({
    ok: false,
    stoppedAt: "review-page",
    pageTotalCents: null,
    orderRef: null,
    replayUrl: null,
    failureReason: "Kernel client is unused. The product stores the offer URL and does not check out.",
    usingFallback: true,
  });
}

async function realVerifyOffer(url: string, emit: EmitTrace): Promise<VerifiedOffer> {
  const kernel = kernelClient();
  let sessionId: string | undefined;
  try {
    const browser = await traced(emit, "kernel", "browser create (verify)", () =>
      kernel.browsers.create({ stealth: true, headless: true, timeout_seconds: 120 }),
    (b) => ({ kernelSessionId: b.session_id }));
    sessionId = browser.session_id;
    const res = await traced(emit, "kernel", `read offer page ${hostOf(url)}`, () =>
      kernel.browsers.playwright.execute(browser.session_id, { code: verifyScript(url), timeout_sec: 60 }),
    (r) => ({ success: r.success }));
    if (!res.success) throw new Error(res.error ?? res.stderr ?? "Playwright execution failed");
    const page = res.result as { title?: string; url?: string; html?: string };
    const extracted = extractPriceFromHtml(page.html ?? "");
    safeEmit(emit, {
      sponsor: "kernel",
      label: "offer verified",
      status: "ok",
      durationMs: null,
      provenance: "live",
      detail: { url, priceCents: extracted.priceCents, inStock: extracted.inStock, priceSource: extracted.source },
    });
    return {
      url,
      title: page.title || hostOf(url),
      priceCents: extracted.priceCents,
      inStock: extracted.inStock,
      kernelSessionId: browser.session_id,
      replayUrl: null,
    };
  } catch (err) {
    return fallbackVerifyOffer(url, emit, `Kernel call failed: ${errorMessage(err)}`);
  } finally {
    if (sessionId) await deleteBrowser(kernel, sessionId, emit);
  }
}

async function realCheckout(req: CheckoutRequest, emit: EmitTrace): Promise<CheckoutResult> {
  const kernel = kernelClient();
  const adapter = adapterFor(req.url);
  const result: CheckoutResult = {
    ok: false,
    stoppedAt: "review-page",
    pageTotalCents: null,
    orderRef: null,
    replayUrl: null,
    failureReason: null,
  };

  const early = checkPageTotal(req.expectedTotalCents, req.expectedTotalCents);
  if (!early.ok) return { ...result, failureReason: early.reason };

  const vault = env.kernelVault();
  let sessionId: string | undefined;
  let replayId: string | undefined;
  let reachedReview = false;
  try {
    const browser = await traced(emit, "kernel", "browser create (checkout)", () =>
      kernel.browsers.create({
        stealth: true,
        timeout_seconds: 300,
        ...(vault ? { vaults: [vaultRef(vault)] } : {}),
      }),
    (b) => ({ kernelSessionId: b.session_id, liveView: Boolean(b.browser_live_view_url) }));
    sessionId = browser.session_id;

    if (browser.browser_live_view_url) {
      req.onLiveView({ kernelSessionId: browser.session_id, liveViewUrl: browser.browser_live_view_url });
    }

    try {
      const replay = await traced(emit, "kernel", "replay start", () => kernel.browsers.replays.start(browser.session_id));
      replayId = replay.replay_id;
      result.replayUrl = replay.replay_view_url ?? null;
    } catch {
      // Replay is evidence, not a precondition for checkout.
    }

    const toReview = await runScript<{ reachedReview?: boolean; pageUrl?: string; note?: string }>(
      kernel, browser.session_id, `guest checkout to review (${adapter.id})`, adapter.toReviewScript(req.url), emit, 120,
    );
    let pageUrl = toReview.pageUrl ?? req.url;

    if (adapter.paymentFields.length > 0) {
      const item = env.kernelVaultPaymentItem();
      if (!vault || !item) {
        return { ...result, failureReason: "Payment step needs KERNEL_VAULT and KERNEL_VAULT_PAYMENT_ITEM; stopped before payment." };
      }
      const fill = await fillPayment(browser.session_id, vault, item, pageUrl, adapter.paymentFields, emit);
      if (fill !== "completed") {
        return { ...result, failureReason: `Vault payment fill ${fill}; stopped without retrying.` };
      }
      const after = await runScript<{ reachedReview?: boolean; pageUrl?: string }>(
        kernel, browser.session_id, "continue to review", `
          const btn = page.getByRole("button", { name: /continue|review order|next/i }).first();
          if (await btn.count()) { await btn.click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(3000); }
          const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 4000);
          return { reachedReview: /review (your )?order|place order|complete order/i.test(body), pageUrl: page.url() };
        `, emit, 60,
      );
      toReview.reachedReview = after.reachedReview;
      pageUrl = after.pageUrl ?? pageUrl;
    }

    if (!toReview.reachedReview) {
      return { ...result, failureReason: `Did not reach the order-review page (${toReview.note ?? "unknown"}).` };
    }
    reachedReview = true;

    const total = await runScript<{ totalText?: string | null }>(kernel, browser.session_id, "read order total", adapter.readTotalScript, emit, 30);
    result.pageTotalCents = parseMoneyToCents(total.totalText ?? null);

    const step = nextCheckoutStep(req.mode, checkPageTotal(result.pageTotalCents, req.expectedTotalCents));
    safeEmit(emit, {
      sponsor: "kernel",
      label: step.action === "abort" ? "checkout aborted: total mismatch" : "order total matches approval",
      status: step.action === "abort" ? "error" : "ok",
      durationMs: null,
      provenance: "live",
      detail: { pageTotalCents: result.pageTotalCents, expectedTotalCents: req.expectedTotalCents, mode: req.mode },
    });

    if (step.action === "abort") return { ...result, failureReason: step.reason };
    if (step.action === "stop-at-review") return { ...result, ok: true, stoppedAt: "review-page" };

    const placed = await runScript<{ orderRef?: string | null; error?: string }>(
      kernel, browser.session_id, "place order", adapter.placeOrderScript, emit, 60,
    );
    if (placed.error) return { ...result, failureReason: placed.error };
    return { ...result, ok: true, stoppedAt: "placed", orderRef: placed.orderRef ?? null };
  } catch (err) {
    return { ...result, failureReason: `Kernel checkout failed: ${errorMessage(err)}` };
  } finally {
    if (sessionId) {
      if (reachedReview && req.mode === "review" && REVIEW_HOLD_MS > 0) await sleep(REVIEW_HOLD_MS);
      if (replayId) {
        await kernel.browsers.replays.stop(replayId, { id_or_name: sessionId }).catch(() => {});
        if (!result.replayUrl) {
          const list = await kernel.browsers.replays.list(sessionId).catch(() => []);
          result.replayUrl = list.find((r) => r.replay_id === replayId)?.replay_view_url ?? null;
        }
      }
      await deleteBrowser(kernel, sessionId, emit);
    }
  }
}

async function runScript<T>(kernel: Kernel, sessionId: string, label: string, code: string, emit: EmitTrace, timeoutSec: number): Promise<T> {
  const res = await traced(emit, "kernel", label, () =>
    kernel.browsers.playwright.execute(sessionId, { code, timeout_sec: timeoutSec }),
  (r) => ({ success: r.success }));
  if (!res.success) throw new Error(`${label}: ${res.error ?? "Playwright execution failed"}`);
  return (res.result ?? {}) as T;
}

/** Payment values go from the Vault straight into the page. Only value-free statuses come back, and only those are traced. */
async function fillPayment(
  sessionId: string,
  vault: string,
  item: string,
  pageUrl: string,
  fields: { field: string; selector: string }[],
  emit: EmitTrace,
): Promise<"completed" | "failed" | "unknown" | "unavailable"> {
  const k = kernelFillClient();
  const vaultItem = await traced(emit, "kernel", "vault item lookup", () => k.vaults.items.retrieve(item, { id_or_name: vault }));
  if (!vaultItem.available_operations?.some((op) => op.type === "fill")) return "unavailable";
  const res = await traced(emit, "kernel", "vault fill payment", () =>
    k.vaults.items.performOperation(vaultItem.key, {
      id_or_name: vault,
      type: "fill",
      browser_id: sessionId,
      page_url: pageUrl,
      fields,
      timeout_ms: 20_000,
    }),
  (r) => ({ status: "status" in r ? r.status : "unknown" }));
  if (res.type !== "fill") return "unknown";
  return res.status;
}

async function deleteBrowser(kernel: Kernel, sessionId: string, emit: EmitTrace) {
  await traced(emit, "kernel", "browser delete", () => kernel.browsers.deleteByID(sessionId)).catch(() => {});
}

function vaultRef(v: string) {
  return /^[0-9a-f-]{20,}$/i.test(v) ? { id: v } : { name: v };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
