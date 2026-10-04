/** Env reads in one place. Payment data is never read from env: only the name of a Kernel Vault item. */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const get = (name: string): string | undefined => {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
};

/**
 * Fills missing env vars from local key files. Never logs values. Call from entrypoints
 * (inbox, sprite deploy), not from the library import, so tests stay offline.
 */
export function loadLocalSecrets(): void {
  for (const file of [join(homedir(), ".llm-keys"), join(homedir(), ".buyer-secrets")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!/^[A-Z0-9_]+$/.test(key) || process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export const env = {
  kernelApiKey: () => get("KERNEL_API_KEY"),
  /** Vault that holds the payment item (name or id). Attached to the checkout browser. */
  kernelVault: () => get("KERNEL_VAULT"),
  kernelVaultPaymentItem: () => get("KERNEL_VAULT_PAYMENT_ITEM"),
  agentmailApiKey: () => get("AGENTMAIL_API_KEY"),
  agentmailInboxId: () => get("AGENTMAIL_INBOX_ID"),
  /** Public address of the agent's inbox. The API id may be a UUID; this is the mailbox people forward to. */
  agentmailInboxAddress: () => "signal-os-concierge@agentmail.to",
  openrouterApiKey: () => get("OPENROUTER_API_KEY"),
  /** Receipt triage model. Never `typesafe/jev-router` (that product picks a chat model). */
  jevModel: () => "typesafe/jev-1.13" as const,
  jevDecisionsUrl: () => "https://openrouter.ai/api/alpha/decisions",
  coreBaseUrl: () => (get("CORE_BASE_URL") ?? get("AGENT_BASE_URL") ?? "http://localhost:4111").replace(/\/$/, ""),
  /** Full URL of core's ingest route, when core has published one. */
  ingestUrl: () => get("INGEST_URL"),
  spritesToken: () => get("SPRITES_TOKEN"),
  spriteOrg: () => get("SPRITE_ORG") ?? "stefano94120",
  spriteName: () => get("SPRITE_NAME") ?? "buyer-worker",
  spriteUrl: () => get("SPRITE_URL") ?? "https://buyer-worker-b3y4b.sprites.app",
  llm: (): { baseUrl: string; apiKey: string; model: string; source: "neon-ai-gateway" | "openai" } | undefined => {
    const gwToken = get("NEON_AI_GATEWAY_TOKEN");
    const gwBase = get("NEON_AI_GATEWAY_BASE_URL");
    if (gwToken && gwBase) {
      return { baseUrl: gwBase, apiKey: gwToken, model: get("LLM_MODEL_FAST") ?? "gpt-4o-mini", source: "neon-ai-gateway" };
    }
    const key = get("OPENAI_API_KEY");
    if (key) {
      return {
        baseUrl: get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
        apiKey: key,
        model: get("LLM_MODEL_FAST") ?? "gpt-4o-mini",
        source: "openai",
      };
    }
    return undefined;
  },
};
