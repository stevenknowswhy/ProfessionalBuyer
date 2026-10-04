import type { EmitTrace, Integrations } from "@buyer/contract";

/**
 * Local stand-in for @buyer/integrations. Every call reports `usingFallback` / "replayed"-style labels
 * so nothing it returns can be mistaken for a live Kernel, AgentMail, Sprite or Laya result.
 */
const STUB_NOTE = "local stub: @buyer/integrations not wired yet";

function stubTrace(emit: EmitTrace, sponsor: "kernel" | "agentmail" | "laya", label: string) {
  emit({ sponsor, label: `${label} (stub)`, status: "skipped", durationMs: 0, provenance: "sample", detail: { usingFallback: true } });
}

export const integrationsStub: Integrations = {
  kernel: {
    async verifyOffer(url, emit) {
      stubTrace(emit, "kernel", "Verify offer");
      return { url, title: "Unverified (stub)", priceCents: null, inStock: true, kernelSessionId: "stub-session", replayUrl: null };
    },
    async checkout(req, emit) {
      stubTrace(emit, "kernel", `Checkout in ${req.mode} mode`);
      return {
        ok: false,
        stoppedAt: "review-page",
        pageTotalCents: null,
        orderRef: null,
        replayUrl: null,
        failureReason: "Kernel checkout is stubbed; no browser was opened",
      };
    },
  },
  mail: {
    inboxAddress: () => "stub-inbox@example.invalid",
    async onInbound(_handler, emit) {
      stubTrace(emit, "agentmail", "Inbox listener");
      return () => {};
    },
    async send(_msg, emit) {
      stubTrace(emit, "agentmail", "Send email");
      return { messageId: "stub-message" };
    },
  },
  triage: {
    async isReceipt(text, emit) {
      stubTrace(emit, "laya", "Receipt triage");
      return { isReceipt: /total|subtotal|order/i.test(text), confidence: 0.5, via: "llm" };
    },
  },
  async health() {
    return (["kernel", "agentmail", "fly", "laya"] as const).map((sponsor) => ({
      sponsor,
      status: "degraded" as const,
      note: STUB_NOTE,
      usingFallback: true,
    }));
  },
};
