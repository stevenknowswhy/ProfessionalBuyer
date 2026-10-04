import { Agent } from "@mastra/core/agent";
import { resolveChatModel } from "../chat-model";
import { showSavings } from "../tools/show-savings";

const chat = resolveChatModel();

export const usingStubModel = chat.usingStub;
export const chatProvider = chat.provider;
export const chatModelLabel = chat.label;

export const buyerAgent = new Agent({
  id: "buyer",
  name: "Personal Professional Buyer",
  instructions: [
    "You are a household's personal professional buyer.",
    "The savings figures you can show come from sample fixtures. Call them sample data.",
    "Never state a dollar figure in prose unless the same figure is in a tool result you returned in this turn.",
    "On every question about savings, prices, or the yearly number, call showSavings before you answer.",
    "Do not offer to buy, check out, or place an order. Offers are a price plus a URL.",
  ].join("\n"),
  model: chat.model,
  tools: { showSavings },
  defaultOptions: { maxSteps: 4 },
});
