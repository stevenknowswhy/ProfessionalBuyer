import type { Approval, EndpointName, TraceEvent } from "@buyer/contract";
import approvalsJson from "@buyer/contract/fixtures/approvals.sample.json";
import healthJson from "@buyer/contract/fixtures/health.sample.json";
import householdJson from "@buyer/contract/fixtures/household.sample.json";
import savingsJson from "@buyer/contract/fixtures/savings.sample.json";
import traceJson from "@buyer/contract/fixtures/trace.sample.json";
import watchObservationsJson from "@buyer/contract/fixtures/watch-observations.sample.json";
import watchesJson from "@buyer/contract/fixtures/watches.sample.json";

/**
 * Fixture backend. Returns raw JSON exactly as the core API would, so lib/api.ts validates it with the same
 * contract schemas. Nothing here invents a dollar figure: every amount comes from contract/fixtures.
 */

export const FIXTURE_LATENCY_MS = 120;
const EXECUTE_MS = 4000;

export const fixtures = {
  approvals: approvalsJson as unknown,
  health: healthJson as unknown,
  household: householdJson as unknown,
  savings: savingsJson as unknown,
  trace: traceJson as unknown,
  watches: watchesJson as unknown,
  watchObservations: watchObservationsJson as unknown,
};

const clone = <T>(value: T): T => structuredClone(value);

let approvals: Approval[] = clone(approvalsJson as Approval[]);
const timers = new Map<string, ReturnType<typeof setTimeout>>();

type TraceListener = (event: unknown) => void;
const traceListeners = new Set<TraceListener>();
let traceSeq = 0;

export function subscribeFixtureTrace(listener: TraceListener): () => void {
  traceListeners.add(listener);
  return () => traceListeners.delete(listener);
}

export function emitFixtureTrace(event: Omit<TraceEvent, "id" | "at" | "provenance">) {
  traceSeq += 1;
  const full = { ...event, id: `fx-${Date.now()}-${traceSeq}`, at: new Date().toISOString(), provenance: "sample" };
  traceListeners.forEach((listener) => listener(full));
}

/** The first events arrive as history; the rest are streamed by useTraceStream to simulate SSE. */
export const TRACE_HISTORY_COUNT = 2;
export const TRACE_STREAM_INTERVAL_MS = 900;

export function fixtureTraceSplit(): { history: unknown[]; stream: unknown[] } {
  const all = clone(traceJson as unknown[]);
  return { history: all.slice(0, TRACE_HISTORY_COUNT), stream: all.slice(TRACE_HISTORY_COUNT) };
}

export function resetFixtureApprovals() {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  approvals = clone(approvalsJson as Approval[]);
}

function setApproval(id: string, patch: Partial<Approval>): Approval | undefined {
  approvals = approvals.map((a) => (a.id === id ? { ...a, ...patch } : a));
  return approvals.find((a) => a.id === id);
}

function approve(id: string): Approval {
  const current = approvals.find((a) => a.id === id);
  if (!current) throw notFound(`approval ${id}`);
  if (current.status !== "pending") return current;

  const decidedAt = new Date().toISOString();
  if (current.amountCents > current.capCents) {
    emitFixtureTrace({ sponsor: "executor", label: "Checkout blocked: over the spending cap", status: "error", durationMs: 4, policy: "block" });
    return setApproval(id, { status: "blocked", decidedAt, blockedReason: "The amount is over your spending cap." })!;
  }

  emitFixtureTrace({ sponsor: "executor", label: "kernel.checkout allowed after your approval", status: "ok", durationMs: 9, policy: "allow" });
  emitFixtureTrace({ sponsor: "kernel", label: `Opening ${current.merchant} checkout`, status: "running", durationMs: null });
  const executing = setApproval(id, {
    status: "executing",
    decidedAt,
    checkout: {
      kernelSessionId: "sample-kernel-session",
      liveViewUrl: null,
      replayUrl: null,
      stoppedAt: current.mode === "review" ? "review-page" : "placed",
      orderRef: null,
    },
  })!;

  timers.set(
    id,
    setTimeout(() => {
      const a = approvals.find((x) => x.id === id);
      if (!a || a.status !== "executing" || !a.checkout) return;
      setApproval(id, {
        status: "completed",
        checkout: { ...a.checkout, orderRef: a.mode === "place" ? "SAMPLE-ORDER" : null },
      });
      emitFixtureTrace({
        sponsor: "kernel",
        label: a.mode === "review" ? "Stopped at the order review page" : "Order placed",
        status: "ok",
        durationMs: EXECUTE_MS,
      });
    }, EXECUTE_MS),
  );
  return executing;
}

function decline(id: string): Approval {
  const current = approvals.find((a) => a.id === id);
  if (!current) throw notFound(`approval ${id}`);
  if (current.status !== "pending") return current;
  emitFixtureTrace({ sponsor: "system", label: "You declined the purchase", status: "skipped", durationMs: null });
  return setApproval(id, { status: "declined", decidedAt: new Date().toISOString() })!;
}

function scan() {
  const { stream } = fixtureTraceSplit();
  (traceJson as TraceEvent[]).slice(0, TRACE_HISTORY_COUNT).concat(stream as TraceEvent[]).forEach((event, i) => {
    setTimeout(() => {
      const { id: _id, at: _at, provenance: _p, ...rest } = event;
      emitFixtureTrace(rest);
    }, (i + 1) * TRACE_STREAM_INTERVAL_MS);
  });
  return { runId: (savingsJson as { id: string }).id };
}

export class FixtureNotFound extends Error {
  status = 404;
  code = "not_found";
}
const notFound = (what: string) => new FixtureNotFound(`No ${what} in the sample data`);

export function fixtureResponse(name: Exclude<EndpointName, "trace">, params: Record<string, string>): unknown {
  switch (name) {
    case "health":
      return clone(healthJson);
    case "household":
      return clone(householdJson);
    case "seed":
      return { receipts: (householdJson as { receipts: unknown[] }).receipts.length };
    case "scan":
      return scan();
    case "savingsLatest":
      return clone(savingsJson);
    case "savingsById":
      if (params.id !== (savingsJson as { id: string }).id) throw notFound(`savings run ${params.id}`);
      return clone(savingsJson);
    case "traceHistory":
      return fixtureTraceSplit().history;
    case "approvals":
      return clone(approvals);
    case "approvalApprove":
      return clone(approve(params.id));
    case "approvalDecline":
      return clone(decline(params.id));
    case "watches":
      return clone(watchesJson);
    case "watchObservations":
      return (watchObservationsJson as { watchId: string }[]).filter((o) => o.watchId === params.id);
    case "sendBriefing":
      return { sent: true, to: "the demo inbox (sample)" };
  }
}
