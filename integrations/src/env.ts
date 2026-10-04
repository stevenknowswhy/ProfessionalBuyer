/** Env reads in one place. Payment data is never read from env: only the name of a Kernel Vault item. */
const get = (name: string): string | undefined => {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
};

export const env = {
  kernelApiKey: () => get("KERNEL_API_KEY"),
  /** Vault that holds the payment item (name or id). Attached to the checkout browser. */
  kernelVault: () => get("KERNEL_VAULT"),
  kernelVaultPaymentItem: () => get("KERNEL_VAULT_PAYMENT_ITEM"),
  agentmailApiKey: () => get("AGENTMAIL_API_KEY"),
  agentmailInboxId: () => get("AGENTMAIL_INBOX_ID"),
  layaUrl: () => get("LAYA_URL"),
  spritesToken: () => get("SPRITES_TOKEN"),
  spriteName: () => get("SPRITE_NAME") ?? "buyer-worker",
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
