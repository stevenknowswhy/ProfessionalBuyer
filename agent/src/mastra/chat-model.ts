import type { ModelWithRetries } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { createStubModel } from "./stub-model";

const OPENAI_PROVIDER = "openai";
const OPENROUTER_PROVIDER = "openrouter";

export type ChatProvider = "openai" | "openrouter" | "stub";

export type ResolvedChatModel = {
  model: MastraModelConfig | ModelWithRetries[];
  usingStub: boolean;
  provider: ChatProvider;
  /** Provider and model id, safe to log. Never includes a key. */
  label: string;
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Model id without a duplicated provider prefix (`openai/gpt-4o-mini` -> `gpt-4o-mini`). */
function modelName(raw: string | undefined, fallback: string, provider: string): string {
  const value = raw?.trim() || fallback;
  const prefix = `${provider}/`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

/**
 * Chat uses OpenAI gpt-4o-mini. On a missing key, 429, or 5xx, Mastra's model
 * list retries the same request through OpenRouter's `openrouter/free` router.
 * With neither key, the deterministic stub answers so the contract still holds.
 */
export function resolveChatModel(): ResolvedChatModel {
  const openaiKey = env("OPENAI_API_KEY");
  const openrouterKey = env("OPENROUTER_API_KEY");
  const openaiModel = modelName(env("OPENAI_MODEL_CHAT"), "gpt-4o-mini", OPENAI_PROVIDER);
  const openrouterModel = modelName(env("OPENROUTER_MODEL"), "openrouter/free", OPENROUTER_PROVIDER);

  // Mastra parses provider/model on the first slash, so the OpenRouter model
  // id `openrouter/free` is the router string `openrouter/openrouter/free`.
  const ids: string[] = [];
  if (openaiKey) ids.push(`${OPENAI_PROVIDER}/${openaiModel}`);
  if (openrouterKey) ids.push(`${OPENROUTER_PROVIDER}/${openrouterModel}`);
  const entries: ModelWithRetries[] = ids.map((id) => ({ model: id, maxRetries: 1 }));

  if (entries.length === 0) {
    return { model: createStubModel(), usingStub: true, provider: "stub", label: "stub/buyer-stub" };
  }

  const primary = openaiKey ? "openai" : "openrouter";
  const primaryModel = primary === "openai" ? openaiModel : openrouterModel;
  const label =
    entries.length === 2
      ? `${OPENAI_PROVIDER}/${openaiModel} (fallback ${OPENROUTER_PROVIDER}/${openrouterModel})`
      : `${primary}/${primaryModel}`;

  const model: MastraModelConfig | ModelWithRetries[] = ids.length === 1 ? ids[0] : entries;
  return {
    model,
    usingStub: false,
    provider: primary,
    label,
  };
}
