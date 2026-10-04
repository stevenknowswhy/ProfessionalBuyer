import { MockLanguageModelV4 } from "ai/test";

type StreamPart = { type: string; [key: string]: unknown };

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

function stream(parts: StreamPart[]) {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
}

/**
 * Deterministic chat model used when no LLM key is configured. It always calls `showSavings`, then
 * answers with a fixed sentence that says it is a stub. It never invents figures: the numbers live in the tool result.
 */
export function createStubModel() {
  return new MockLanguageModelV4({
    provider: "stub",
    modelId: "buyer-stub",
    doStream: async (options) => {
      const last = options.prompt.at(-1);
      const parts: StreamPart[] =
        last?.role === "tool"
          ? [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "t1" },
              {
                type: "text-delta",
                id: "t1",
                delta:
                  "No LLM key is configured, so this is the canned stub agent. The card shows the sample savings run (labeled Sample data).",
              },
              { type: "text-end", id: "t1" },
              { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
            ]
          : [
              { type: "stream-start", warnings: [] },
              { type: "tool-call", toolCallId: `stub-${Date.now()}`, toolName: "showSavings", input: "{}" },
              { type: "finish", finishReason: { unified: "tool-calls", raw: "tool_calls" }, usage },
            ];
      return { stream: stream(parts) } as Awaited<ReturnType<MockLanguageModelV4["doStream"]>>;
    },
  });
}
