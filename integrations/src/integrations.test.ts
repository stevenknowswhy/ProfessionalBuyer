import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { EmitTrace, Integrations } from "@buyer/contract";
import { checkPageTotal, nextCheckoutStep, formatCents } from "./checkout-guard";
import { extractPriceFromHtml, parseMoneyToCents } from "./price";
import { heuristicIsReceipt } from "./triage";
import { createIntegrations } from "./index";
import { AGENT_INBOX, FALLBACK_INBOX } from "./mail";
import { deliverToCore, ingestReceipt } from "./ingest";
import { JEV_DECISIONS_URL, JEV_MODEL, jevRequestModel } from "./triage";

const KEYS = [
  "KERNEL_API_KEY",
  "KERNEL_VAULT",
  "KERNEL_VAULT_PAYMENT_ITEM",
  "AGENTMAIL_API_KEY",
  "AGENTMAIL_INBOX_ID",
  "LAYA_URL",
  "OPENROUTER_API_KEY",
  "JEV_MODEL",
  "INGEST_URL",
  "CORE_BASE_URL",
  "AGENT_BASE_URL",
  "SPRITES_TOKEN",
  "NEON_AI_GATEWAY_TOKEN",
  "NEON_AI_GATEWAY_BASE_URL",
  "OPENAI_API_KEY",
];

function recorder() {
  const events: Parameters<EmitTrace>[0][] = [];
  const emit: EmitTrace = (e) => events.push(e);
  return { events, emit };
}

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
});

// --- checkout money safety (pure) ---

test("checkout proceeds only when the page total equals the approved total exactly", () => {
  assert.deepEqual(checkPageTotal(2199, 2199), { ok: true });
  assert.deepEqual(nextCheckoutStep("review", checkPageTotal(2199, 2199)), { action: "stop-at-review" });
  assert.deepEqual(nextCheckoutStep("place", checkPageTotal(2199, 2199)), { action: "place-order" });
});

test("checkout aborts when the page total differs, even by one cent, in either direction", () => {
  for (const page of [2200, 2198, 0, 219900]) {
    const check = checkPageTotal(page, 2199);
    assert.equal(check.ok, false);
    const step = nextCheckoutStep("place", check);
    assert.equal(step.action, "abort");
    if (step.action === "abort") assert.match(step.reason, /differs from approved \$21\.99/);
  }
});

test("checkout aborts when the total cannot be read or the expected total is invalid", () => {
  assert.equal(nextCheckoutStep("place", checkPageTotal(null, 2199)).action, "abort");
  assert.equal(nextCheckoutStep("place", checkPageTotal(21.99, 2199)).action, "abort");
  assert.equal(nextCheckoutStep("review", checkPageTotal(2199, 0)).action, "abort");
  assert.equal(nextCheckoutStep("review", checkPageTotal(2199, -5)).action, "abort");
  assert.equal(nextCheckoutStep("review", checkPageTotal(2199, 21.99)).action, "abort");
});

test("formatCents renders dollars", () => {
  assert.equal(formatCents(2199), "$21.99");
  assert.equal(formatCents(123456), "$1,234.56");
  assert.equal(formatCents(5), "$0.05");
});

// --- price parsing (pure) ---

test("parseMoneyToCents handles symbols, commas and missing decimals", () => {
  assert.equal(parseMoneyToCents("$21.99"), 2199);
  assert.equal(parseMoneyToCents("Order total: $1,234.50"), 123450);
  assert.equal(parseMoneyToCents("USD 12"), 1200);
  assert.equal(parseMoneyToCents("12.5"), 1250);
  assert.equal(parseMoneyToCents("free"), null);
  assert.equal(parseMoneyToCents(null), null);
});

test("extractPriceFromHtml prefers JSON-LD, then meta, then text", () => {
  const ld = `<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"19.49","availability":"https://schema.org/InStock"}}</script><p>$99.99</p>`;
  assert.deepEqual(extractPriceFromHtml(ld), { priceCents: 1949, inStock: true, source: "json-ld" });
  const meta = `<meta property="product:price:amount" content="7.25"><p>$99.99</p>`;
  assert.deepEqual(extractPriceFromHtml(meta), { priceCents: 725, inStock: true, source: "meta" });
  assert.deepEqual(extractPriceFromHtml(`<div>Now <b>$3.10</b></div>`), { priceCents: 310, inStock: true, source: "text" });
  const oos = `<script type="application/ld+json">[{"offers":[{"price":5,"availability":"OutOfStock"}]}]</script>`;
  assert.deepEqual(extractPriceFromHtml(oos), { priceCents: 500, inStock: false, source: "json-ld" });
  assert.equal(extractPriceFromHtml("<p>no price</p>").priceCents, null);
});

// --- fallbacks with no keys ---

test("default export satisfies Integrations and every fallback is labeled", async () => {
  const integrations: Integrations = createIntegrations();
  const { events, emit } = recorder();

  const offer = await integrations.kernel.verifyOffer("https://shop.example.com/p/1", emit);
  assert.equal(offer.usingFallback, true);
  assert.equal(offer.priceCents, null, "an unverified offer never carries a price");
  assert.equal(offer.inStock, false);
  assert.match(offer.kernelSessionId, /^fallback-/);
  assert.deepEqual(offer, await integrations.kernel.verifyOffer("https://shop.example.com/p/1", () => {}), "deterministic");

  let liveViewCalled = false;
  const co = await integrations.kernel.checkout(
    { url: "https://shop.example.com/p/1", mode: "place", expectedTotalCents: 2199, onLiveView: () => (liveViewCalled = true) },
    emit,
  );
  assert.equal(co.ok, false);
  assert.equal(co.usingFallback, true);
  assert.equal(co.orderRef, null);
  assert.notEqual(co.stoppedAt, "placed");
  assert.equal(liveViewCalled, false, "no browser, so no live view");

  assert.equal(integrations.mail.inboxAddress(), FALLBACK_INBOX);
  const sent = await integrations.mail.send({ to: "me@example.com", subject: "Briefing", text: "hi" }, emit);
  assert.equal(sent.usingFallback, true);
  assert.match(sent.messageId, /^fallback-/);
  const stop = await integrations.mail.onInbound(async () => assert.fail("no mail in fallback"), emit);
  stop();

  const tri = await integrations.triage.isReceipt("Thank you for your order #123. Subtotal $10.00 Total $10.80", emit);
  assert.equal(tri.isReceipt, true);
  assert.equal(tri.method, "heuristic");
  assert.equal(tri.usingFallback, true);

  assert.ok(events.length >= 5);
  for (const e of events) {
    assert.equal(e.status, "skipped");
    assert.notEqual(e.provenance, "live");
    assert.equal(e.detail?.usingFallback, true);
    assert.match(e.label, /\(fallback\)/);
  }
  assert.deepEqual(
    [...new Set(events.map((e) => e.sponsor))].sort(),
    ["agentmail", "kernel", "laya"],
  );
});

test("health reports every sponsor as a fallback when no keys are set", async () => {
  const h = await createIntegrations().health();
  assert.deepEqual(h.map((s) => s.sponsor).sort(), ["agentmail", "fly", "kernel", "laya"]);
  for (const s of h) {
    assert.equal(s.usingFallback, true);
    assert.notEqual(s.status, "green");
  }
});

test("triage calls Jev on the decisions endpoint and never jev-router", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.JEV_MODEL = "typesafe/jev-router";
  const { events, emit } = recorder();
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.equal(url, JEV_DECISIONS_URL);
    const body = JSON.parse(String(init?.body)) as { model?: string };
    assert.equal(body.model, JEV_MODEL);
    assert.equal(jevRequestModel(), "typesafe/jev-1.13");
    assert.equal(init?.headers && (init.headers as Record<string, string>).authorization, "Bearer test-key");
    return new Response(JSON.stringify({ model: "typesafe/jev-1.13-20260917", answers: { is_receipt: { noul: 0.95, type: "noul" } } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const tri = await createIntegrations().triage.isReceipt("Thank you for your order #9. Total $12.00", emit);
    assert.equal(tri.isReceipt, true);
    assert.equal(tri.via, "jev");
    assert.equal(tri.method, "jev");
    assert.equal(tri.usingFallback, undefined);
    assert.ok(events.some((e) => e.sponsor === "laya" && e.status === "ok" && e.label === "receipt triage via Jev"));
  } finally {
    globalThis.fetch = original;
  }
});

test("triage falls back to the heuristic when Jev is down, and says so", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  const { events, emit } = recorder();
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("connect ECONNREFUSED");
  };
  try {
    const tri = await createIntegrations().triage.isReceipt("Your package has shipped. Order number 55512", emit);
    assert.equal(tri.method, "heuristic");
    assert.equal(tri.usingFallback, true);
    assert.ok(events.some((e) => e.sponsor === "laya" && /Jev unavailable/.test(String(e.detail?.reason))));
  } finally {
    globalThis.fetch = original;
    delete process.env.OPENROUTER_API_KEY;
  }
  const h = await createIntegrations().health();
  const jev = h.find((s) => s.sponsor === "laya")!;
  assert.equal(jev.status, "degraded");
  assert.match(jev.note, /OPENROUTER_API_KEY not set/);
});

test("inbox address is the concierge mailbox", () => {
  assert.equal(createIntegrations().mail.inboxAddress(), FALLBACK_INBOX);
  process.env.AGENTMAIL_INBOX_ID = "0123456789abcdef0123456789abcdef";
  assert.equal(createIntegrations().mail.inboxAddress(), AGENT_INBOX);
  process.env.AGENTMAIL_INBOX_ID = AGENT_INBOX;
  assert.equal(createIntegrations().mail.inboxAddress(), AGENT_INBOX);
});

test("inbound mail posts to core ingest when the route exists, else the exported function", async () => {
  process.env.CORE_BASE_URL = "http://127.0.0.1:9";
  const down = await deliverToCore(
    { text: "Thank you for your order #123. Subtotal $10.00 Total $10.80", source: "agentmail" },
    () => {},
  );
  assert.equal(down.via, "local");
  assert.equal(down.isReceipt, true);
  assert.match(down.note, /not reachable|not found/);

  const original = globalThis.fetch;
  let posted: string | undefined;
  globalThis.fetch = async (input, init) => {
    posted = String(input);
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  process.env.INGEST_URL = "http://core.test/api/ingest";
  try {
    const live = await deliverToCore({ text: "hello", source: "agentmail" }, () => {});
    assert.equal(live.via, "http");
    assert.equal(live.accepted, true);
    assert.equal(posted, "http://core.test/api/ingest");
  } finally {
    globalThis.fetch = original;
    delete process.env.INGEST_URL;
  }

  const local = await ingestReceipt({ text: "Hey, are we still on for lunch tomorrow?", source: "agentmail" });
  assert.equal(local.via, "local");
  assert.equal(local.isReceipt, false);
});

test("heuristic rejects ordinary mail", () => {
  assert.equal(heuristicIsReceipt("Hey, are we still on for lunch tomorrow?").isReceipt, false);
  assert.equal(heuristicIsReceipt("Your Amazon.com order has shipped. Total $24.99").isReceipt, true);
});
