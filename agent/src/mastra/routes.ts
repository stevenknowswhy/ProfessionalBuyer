import { ENDPOINTS, type Approval, type Health, type TraceEvent } from "@buyer/contract";
import type { EmitTrace } from "@buyer/contract";
import { registerApiRoute } from "@mastra/core/server";
import { HttpError } from "../errors";
import { fixtures } from "../fixtures";
import { integrationsStub as integrations } from "../integrations-stub";
import { chatModelLabel, chatProvider, usingStubModel } from "./agents/buyer";

const TRACE_REPLAY_INTERVAL_MS = 400;
const SSE_HEARTBEAT_MS = 15_000;

const approvals = new Map<string, Approval>();
function resetApprovals() {
  approvals.clear();
  for (const a of fixtures.approvals) approvals.set(a.id, structuredClone(a));
}
resetApprovals();
const runtimeEvents: TraceEvent[] = [];
const traceSubscribers = new Set<(event: TraceEvent) => void>();

const emit: EmitTrace = (partial) => {
  const event: TraceEvent = { ...partial, id: `ev-${crypto.randomUUID()}`, at: new Date().toISOString() };
  runtimeEvents.push(event);
  for (const send of traceSubscribers) send(event);
};

async function health(): Promise<Health> {
  const integrationHealth = await integrations.health();
  const own: Health["services"] = fixtures.health.services
    .filter((s) => !integrationHealth.some((i) => i.sponsor === s.sponsor))
    .map(({ sponsor }): Health["services"][number] => {
      switch (sponsor) {
        case "mastra":
          return {
            sponsor,
            status: usingStubModel ? "degraded" : "green",
            note: usingStubModel
              ? "server up; no LLM key, chat uses the canned stub model"
              : `server up; chat via ${chatModelLabel}${chatProvider === "openrouter" ? " (OpenRouter fallback)" : ""}`,
            usingFallback: usingStubModel || chatProvider === "openrouter",
          };
        case "assistant-ui":
          return { sponsor, status: "green", note: "frontend library; nothing for the backend to check", usingFallback: false };
        case "coderabbit":
          return { sponsor, status: "green", note: "PR review only; not a runtime dependency", usingFallback: false };
        default:
          return { sponsor, status: "degraded", note: "backend stub: serving sample fixtures", usingFallback: true };
      }
    });
  const services = [...own, ...integrationHealth];
  return {
    ok: !services.some((s) => s.status === "red"),
    checkedAt: new Date().toISOString(),
    checkoutMode: process.env.CHECKOUT_MODE === "place" ? "place" : "review",
    services,
  };
}

function findApproval(id: string): Approval {
  const approval = approvals.get(id);
  if (!approval) throw new HttpError(404, "approval_not_found", `No approval with id ${id}`);
  if (approval.status !== "pending") {
    throw new HttpError(409, "approval_not_pending", `Approval ${id} is ${approval.status}, not pending`);
  }
  return approval;
}

/** Stubbed checkout: moves executing -> completed after a short delay so the UI can exercise its polling. */
function runStubCheckout(approval: Approval) {
  setTimeout(async () => {
    const result = await integrations.kernel.checkout(
      { url: "", mode: approval.mode, expectedTotalCents: approval.amountCents, onLiveView: () => {} },
      emit,
    );
    approval.status = "completed";
    approval.checkout = {
      kernelSessionId: "stub-session",
      liveViewUrl: null,
      replayUrl: result.replayUrl,
      stoppedAt: result.stoppedAt,
      orderRef: result.orderRef,
    };
  }, 2_000);
}

function traceStream(signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  return new ReadableStream({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (event: TraceEvent) => write(`data: ${JSON.stringify(event)}\n\n`);
      const timers = fixtures.trace.map((event, i) =>
        setTimeout(() => send(event), (i + 1) * TRACE_REPLAY_INTERVAL_MS),
      );
      const heartbeat = setInterval(() => write(": ping\n\n"), SSE_HEARTBEAT_MS);
      traceSubscribers.add(send);
      cleanup = () => {
        timers.forEach(clearTimeout);
        clearInterval(heartbeat);
        traceSubscribers.delete(send);
      };
      signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
      write(": connected\n\n");
    },
    cancel() {
      cleanup();
    },
  });
}

const E = ENDPOINTS;

export const apiRoutes = [
  registerApiRoute(E.health.path, { method: E.health.method, handler: async (c) => c.json(await health()) }),
  registerApiRoute(E.household.path, { method: E.household.method, handler: async (c) => c.json(fixtures.household) }),
  registerApiRoute(E.seed.path, {
    method: E.seed.method,
    handler: async (c) => {
      // Seeding restores the demo household, including the sample approval back to pending.
      resetApprovals();
      return c.json({ receipts: fixtures.household.receipts.length });
    },
  }),
  registerApiRoute(E.scan.path, { method: E.scan.method, handler: async (c) => c.json({ runId: fixtures.savings.id }) }),
  registerApiRoute(E.savingsLatest.path, { method: E.savingsLatest.method, handler: async (c) => c.json(fixtures.savings) }),
  registerApiRoute(E.savingsById.path, {
    method: E.savingsById.method,
    handler: async (c) => {
      const id = c.req.param("id");
      if (id !== fixtures.savings.id) throw new HttpError(404, "savings_run_not_found", `No savings run with id ${id}`);
      return c.json(fixtures.savings);
    },
  }),
  registerApiRoute(E.traceHistory.path, {
    method: E.traceHistory.method,
    handler: async (c) => c.json([...fixtures.trace, ...runtimeEvents]),
  }),
  registerApiRoute(E.trace.path, {
    method: E.trace.method,
    handler: async (c) =>
      new Response(traceStream(c.req.raw.signal), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      }),
  }),
  registerApiRoute(E.approvals.path, { method: E.approvals.method, handler: async (c) => c.json([...approvals.values()]) }),
  registerApiRoute(E.approvalApprove.path, {
    method: E.approvalApprove.method,
    handler: async (c) => {
      const approval = findApproval(c.req.param("id"));
      approval.status = "executing";
      approval.decidedAt = new Date().toISOString();
      runStubCheckout(approval);
      return c.json(approval);
    },
  }),
  registerApiRoute(E.approvalDecline.path, {
    method: E.approvalDecline.method,
    handler: async (c) => {
      const approval = findApproval(c.req.param("id"));
      approval.status = "declined";
      approval.decidedAt = new Date().toISOString();
      return c.json(approval);
    },
  }),
  registerApiRoute(E.watches.path, { method: E.watches.method, handler: async (c) => c.json(fixtures.watches) }),
  registerApiRoute(E.watchObservations.path, {
    method: E.watchObservations.method,
    handler: async (c) => {
      const id = c.req.param("id");
      if (!fixtures.watches.some((w) => w.id === id)) throw new HttpError(404, "watch_not_found", `No watch with id ${id}`);
      return c.json(fixtures.observations.filter((o) => o.watchId === id));
    },
  }),
  registerApiRoute(E.sendBriefing.path, {
    method: E.sendBriefing.method,
    handler: async (c) => {
      const to = process.env.BRIEFING_TO_EMAIL?.trim() || integrations.mail.inboxAddress();
      await integrations.mail.send({ to, subject: "Daily briefing (stub)", text: "Stub briefing" }, emit);
      return c.json({ sent: false, to });
    },
  }),
  // Registered last: keeps unknown /api paths from falling through to the Studio HTML with a 200.
  registerApiRoute("/api/*", {
    method: "ALL",
    handler: async (c) => {
      throw new HttpError(404, "not_found", `No route ${c.req.method} ${c.req.path}`);
    },
  }),
];
