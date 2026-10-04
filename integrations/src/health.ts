import type { IntegrationHealth } from "@buyer/contract";
import { Kernel } from "@onkernel/sdk";
import { AgentMailClient } from "agentmail";
import { env } from "./env";
import { errorMessage } from "./trace";

const TIMEOUT_MS = 4_000;

/** One real, cheap call per configured service. A missing key is reported as a fallback, never as green. */
export async function health(): Promise<IntegrationHealth[]> {
  return Promise.all([kernelHealth(), mailHealth(), flyHealth(), layaHealth()]);
}

async function kernelHealth(): Promise<IntegrationHealth> {
  const key = env.kernelApiKey();
  if (!key) return { sponsor: "kernel", status: "degraded", note: "KERNEL_API_KEY not set: offers are not verified, checkout disabled", usingFallback: true };
  try {
    const kernel = new Kernel({ apiKey: key, timeout: TIMEOUT_MS, maxRetries: 0 });
    await kernel.browsers.list({ limit: 1 });
    const vault = env.kernelVault() && env.kernelVaultPaymentItem() ? "payment vault configured" : "no payment vault (review mode only)";
    return { sponsor: "kernel", status: "green", note: `Kernel API reachable; ${vault}`, usingFallback: false };
  } catch (err) {
    return { sponsor: "kernel", status: "red", note: `Kernel API error: ${errorMessage(err)}`, usingFallback: true };
  }
}

async function mailHealth(): Promise<IntegrationHealth> {
  const key = env.agentmailApiKey();
  const inbox = env.agentmailInboxId();
  if (!key || !inbox) {
    const missing = [!key && "AGENTMAIL_API_KEY", !inbox && "AGENTMAIL_INBOX_ID"].filter(Boolean).join(", ");
    return { sponsor: "agentmail", status: "degraded", note: `${missing} not set: no inbound mail, sends are logged only`, usingFallback: true };
  }
  try {
    const client = new AgentMailClient({ apiKey: key, timeoutInSeconds: TIMEOUT_MS / 1000, maxRetries: 0 });
    const box = await client.inboxes.get(inbox);
    return { sponsor: "agentmail", status: "green", note: `Inbox ${box.email} reachable`, usingFallback: false };
  } catch (err) {
    return { sponsor: "agentmail", status: "red", note: `AgentMail error: ${errorMessage(err)}`, usingFallback: true };
  }
}

/** Checks the Sprite exists. Whether the worker is writing observations is visible in `watch_observations`, which core reads. */
async function flyHealth(): Promise<IntegrationHealth> {
  const token = env.spritesToken();
  const name = env.spriteName();
  if (!token) return { sponsor: "fly", status: "degraded", note: "SPRITES_TOKEN not set: the price-watch worker runs locally", usingFallback: true };
  try {
    const res = await fetch(`https://api.sprites.dev/v1/sprites/${encodeURIComponent(name)}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) return { sponsor: "fly", status: "red", note: `Sprite ${name} not found: run pnpm --filter worker deploy:sprite`, usingFallback: true };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = (await res.json()) as { status?: string };
    return { sponsor: "fly", status: "green", note: `Sprite ${name} is ${info.status ?? "present"}`, usingFallback: false };
  } catch (err) {
    return { sponsor: "fly", status: "red", note: `Sprites API error: ${errorMessage(err)}`, usingFallback: true };
  }
}

async function layaHealth(): Promise<IntegrationHealth> {
  const url = env.layaUrl();
  const fallback = env.llm() ? `LLM triage (${env.llm()!.source})` : "keyword heuristic (no LLM key)";
  if (!url) return { sponsor: "laya", status: "degraded", note: `LAYA_URL not set: using ${fallback}`, usingFallback: true };
  try {
    const res = await fetch(new URL("/health", url), { signal: AbortSignal.timeout(1_500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { sponsor: "laya", status: "green", note: `Laya sidecar up at ${url}`, usingFallback: false };
  } catch (err) {
    return { sponsor: "laya", status: "degraded", note: `Laya sidecar down (${errorMessage(err)}): using ${fallback}`, usingFallback: true };
  }
}
