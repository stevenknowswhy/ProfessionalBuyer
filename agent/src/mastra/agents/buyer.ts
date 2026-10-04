import { Agent } from "@mastra/core/agent";
import { createStubModel } from "../stub-model";
import { showSavings } from "../tools/show-savings";

/** `provider/model` router id. Unset means no LLM is available and the deterministic stub runs instead. */
const chatModelId = process.env.LLM_MODEL_CHAT?.trim();

export const usingStubModel = !chatModelId;

export const buyerAgent = new Agent({
  id: "buyer",
  name: "Personal Professional Buyer",
  instructions: [
    "You are a household's personal professional buyer.",
    "Never state a dollar figure in prose unless the same figure is in a tool result you returned in this turn.",
    "Use showSavings to present the household's yearly savings number.",
  ].join("\n"),
  model: chatModelId ?? createStubModel(),
  tools: { showSavings },
});
