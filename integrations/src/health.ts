import type { IntegrationHealth } from "@buyer/contract";
import { AgentMailClient } from "agentmail";
import { env } from "./env";
import { JEV_DECISIONS_URL, JEV_MODEL, JEV_RECEIPT_QUESTION } from "./triage";
import { errorMessage } from "./trace";

const TIMEOUT_MS = 4_000;

/** One real, cheap call per configured service. A missing key is reported as a fallback, never as green. */
export async function health(): Promise<IntegrationHealth[]> {
  return Promise.all([kernelHealth(), mailHealth(), flyHealth(), jevHealth()]);
}

async function kernelHealth(): Promise<IntegrationHealth> {
  return {
    sponsor: "kernel",
    status: "degraded",
    note: "Kernel client unused: the product stores offer URLs and does not verify or check out",
    usingFallback: true,
  };
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
  if (!token) {
    return {
      sponsor: "fly",
      status: "degraded",
      note: `SPRITES_TOKEN not set: worker targets existing sprite ${name} at ${env.spriteUrl()} (org ${env.spriteOrg()})`,
      usingFallback: true,
    };
  }
  try {
    const res = await fetch(`https://api.sprites.dev/v1/sprites/${encodeURIComponent(name)}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) {
      return {
        sponsor: "fly",
        status: "red",
        note: `Sprite ${name} not found in org ${env.spriteOrg()}. Expected ${env.spriteUrl()}. Refusing to create another sprite.`,
        usingFallback: true,
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = (await res.json()) as { status?: string };
    return { sponsor: "fly", status: "green", note: `Sprite ${name} is ${info.status ?? "present"}`, usingFallback: false };
  } catch (err) {
    return { sponsor: "fly", status: "red", note: `Sprites API error: ${errorMessage(err)}`, usingFallback: true };
  }
}

/** Sponsor stays `laya` so the existing status chip still names this step. The note says Jev ran. */
async function jevHealth(): Promise<IntegrationHealth> {
  const key = env.openrouterApiKey();
  const fallback = env.llm() ? `LLM triage (${env.llm()!.source})` : "keyword heuristic (no LLM key)";
  if (!key) return { sponsor: "laya", status: "degraded", note: `OPENROUTER_API_KEY not set: Jev skipped, using ${fallback}`, usingFallback: true };
  try {
    const res = await fetch(JEV_DECISIONS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: JEV_MODEL, state: "ping", questions: JEV_RECEIPT_QUESTION }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { model?: string };
    if (body.model?.includes("jev-router")) throw new Error("refusing typesafe/jev-router");
    return { sponsor: "laya", status: "green", note: `Jev ${JEV_MODEL} reachable via OpenRouter decisions`, usingFallback: false };
  } catch (err) {
    return { sponsor: "laya", status: "degraded", note: `Jev unavailable (${errorMessage(err)}): using ${fallback}`, usingFallback: true };
  }
}
