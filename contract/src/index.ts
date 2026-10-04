/**
 * Shared contract between web/ (frontend agent) and agent/ + worker/ (backend agent).
 * Both sides import from here. Neither side edits it alone: see CONTRACT.md "Changing the contract".
 * Money is integer cents. Timestamps are ISO-8601 UTC strings.
 */
import { z } from "zod";

export * from "./landed-cost";

export const SPONSORS = [
  "neon",
  "mastra",
  "exa",
  "fly",
  "kernel",
  "executor",
  "assistant-ui",
  "agentmail",
  "coderabbit",
  "laya",
  "system",
] as const;
export const Sponsor = z.enum(SPONSORS);
export type Sponsor = z.infer<typeof Sponsor>;

export const Channel = z.enum(["local", "shipped", "long-haul"]);
export type Channel = z.infer<typeof Channel>;

const Cents = z.number().int();
const Iso = z.string();

/** Where a number came from. The UI must label anything that is not "live". */
export const Provenance = z.enum(["live", "replayed", "sample"]);
export type Provenance = z.infer<typeof Provenance>;

export const TraceEvent = z.object({
  id: z.string(),
  at: Iso,
  sponsor: Sponsor,
  label: z.string(),
  status: z.enum(["running", "ok", "error", "skipped"]),
  durationMs: z.number().nullable(),
  detail: z.record(z.string(), z.unknown()).optional(),
  /** Set when Executor made a policy decision for this tool call. */
  policy: z.enum(["allow", "ask", "block"]).optional(),
  provenance: Provenance.default("live"),
});
export type TraceEvent = z.infer<typeof TraceEvent>;

export const Item = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  brandStrictness: z.enum(["exact", "equivalent"]),
  /** What one normalized unit is: "sheet", "diaper", "egg", "oz". */
  unit: z.string(),
});
export type Item = z.infer<typeof Item>;

export const Purchase = z.object({
  id: z.string(),
  itemId: z.string(),
  receiptId: z.string(),
  retailer: z.string(),
  date: Iso,
  quantity: z.number(),
  /** Normalized units in everything bought on this line (e.g. 12 double rolls = 2,400 sheets). */
  normalizedUnits: z.number(),
  lineTotalCents: Cents,
});
export type Purchase = z.infer<typeof Purchase>;

export const Receipt = z.object({
  id: z.string(),
  source: z.enum(["agentmail", "seed"]),
  retailer: z.string(),
  receivedAt: Iso,
  triage: z.object({ isReceipt: z.boolean(), via: z.enum(["laya", "llm"]), confidence: z.number() }),
  reconciled: z.boolean(),
  totalCents: Cents,
});
export type Receipt = z.infer<typeof Receipt>;

export const Household = z.object({
  name: z.string(),
  isDemoHousehold: z.boolean(),
  receipts: z.array(Receipt),
  items: z.array(Item),
  purchases: z.array(Purchase),
});
export type Household = z.infer<typeof Household>;

export const Offer = z.object({
  id: z.string(),
  itemId: z.string(),
  channel: Channel,
  retailer: z.string(),
  url: z.string(),
  title: z.string(),
  priceCents: Cents,
  shippingCents: Cents,
  dutyEstimateCents: Cents,
  /** priceCents + shippingCents + dutyEstimateCents. */
  deliveredCents: Cents,
  normalizedUnits: z.number(),
  /** deliveredCents / normalizedUnits, fractional cents. */
  unitCostCents: z.number(),
  inStock: z.boolean(),
  fetchedAt: Iso,
  verifiedByKernel: z.boolean(),
  /** Set when the offer is shown but excluded from ranking, e.g. "can't normalize: sold by weight". */
  excludedReason: z.string().nullable(),
  provenance: Provenance,
});
export type Offer = z.infer<typeof Offer>;

export const ItemSavings = z.object({
  itemId: z.string(),
  offers: z.array(Offer),
  currentUnitCostCents: z.number(),
  bestOfferId: z.string().nullable(),
  unitsPerPurchase: z.number(),
  savingPerBuyCents: Cents,
  history:
    z.discriminatedUnion("enough", [
      z.object({ enough: z.literal(true), buysPerYear: z.number(), purchaseCount: z.number(), spanDays: z.number() }),
      z.object({ enough: z.literal(false), reason: z.string(), purchaseCount: z.number(), spanDays: z.number() }),
    ]),
  /** Null when history is not enough. Excluded from the total. */
  yearlySavingsCents: Cents.nullable(),
});
export type ItemSavings = z.infer<typeof ItemSavings>;

export const SavingsRun = z.object({
  id: z.string(),
  startedAt: Iso,
  finishedAt: Iso.nullable(),
  status: z.enum(["running", "done", "error"]),
  items: z.array(ItemSavings),
  /** Sum of yearlySavingsCents over included items. Computed by code; never typed into the UI. */
  yearlySavingsCents: Cents,
  inputs: z.object({
    receiptCount: z.number(),
    itemCount: z.number(),
    includedItemCount: z.number(),
    channels: z.array(Channel),
    salesTaxIncluded: z.literal(false),
    dutyIsEstimate: z.literal(true),
  }),
  provenance: Provenance,
});
export type SavingsRun = z.infer<typeof SavingsRun>;

export const Approval = z.object({
  id: z.string(),
  itemId: z.string(),
  offerId: z.string(),
  /** Hash of (url, deliveredCents, normalizedUnits). Checked server-side at approve time. */
  offerHash: z.string(),
  merchant: z.string(),
  amountCents: Cents,
  capCents: Cents,
  status: z.enum(["pending", "approved", "declined", "executing", "completed", "failed", "blocked"]),
  blockedReason: z.string().nullable(),
  mode: z.enum(["review", "place"]),
  createdAt: Iso,
  decidedAt: Iso.nullable(),
  checkout: z
    .object({
      kernelSessionId: z.string(),
      liveViewUrl: z.string().nullable(),
      replayUrl: z.string().nullable(),
      stoppedAt: z.enum(["review-page", "placed"]),
      orderRef: z.string().nullable(),
    })
    .nullable(),
});
export type Approval = z.infer<typeof Approval>;

export const Watch = z.object({
  id: z.string(),
  itemId: z.string(),
  offerUrl: z.string(),
  startedAt: Iso,
  observationCount: z.number(),
  lastCheckedAt: Iso.nullable(),
  /** Where the poller runs: a Fly Sprite or the local fallback. */
  runsOn: z.enum(["sprite", "local"]),
  lastPriceCents: Cents.nullable(),
});
export type Watch = z.infer<typeof Watch>;

export const WatchObservation = z.object({
  id: z.string(),
  watchId: z.string(),
  at: Iso,
  priceCents: Cents.nullable(),
  inStock: z.boolean(),
});
export type WatchObservation = z.infer<typeof WatchObservation>;

export const Health = z.object({
  ok: z.boolean(),
  checkedAt: Iso,
  checkoutMode: z.enum(["review", "place"]),
  services: z.array(
    z.object({
      sponsor: Sponsor,
      status: z.enum(["green", "red", "degraded"]),
      /** Plain words, shown on the preflight screen. */
      note: z.string(),
      /** True when a labeled fallback is active instead of the real service. */
      usingFallback: z.boolean(),
    }),
  ),
});
export type Health = z.infer<typeof Health>;

/**
 * Chat tool results. The Mastra agent returns these as tool outputs; the UI renders each as a designed card
 * keyed by tool name (see TOOL_RESULT_SCHEMAS). Text is never the only carrier of these numbers.
 */
export const ToolResults = {
  showSavings: SavingsRun,
  showOffers: ItemSavings,
  proposePurchase: Approval,
  showLiveView: z.object({
    kernelSessionId: z.string(),
    liveViewUrl: z.string(),
    caption: z.string(),
  }),
} as const;
export type ToolName = keyof typeof ToolResults;
export const TOOL_NAMES = Object.keys(ToolResults) as ToolName[];

export const ApiError = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiError = z.infer<typeof ApiError>;

/**
 * REST surface served by the Mastra server (default http://localhost:4111).
 * Chat streaming is separate: POST /chat (Mastra chatRoute, AI SDK UI message stream).
 * `trace` is Server-Sent Events: each `data:` line is one TraceEvent JSON.
 */
export const ENDPOINTS = {
  health: { method: "GET", path: "/api/health", response: Health },
  household: { method: "GET", path: "/api/household", response: Household },
  seed: { method: "POST", path: "/api/seed", response: z.object({ receipts: z.number() }) },
  scan: { method: "POST", path: "/api/scan", response: z.object({ runId: z.string() }) },
  savingsLatest: { method: "GET", path: "/api/savings/latest", response: SavingsRun.nullable() },
  savingsById: { method: "GET", path: "/api/savings/:id", response: SavingsRun },
  trace: { method: "GET", path: "/api/trace", response: TraceEvent, sse: true },
  traceHistory: { method: "GET", path: "/api/trace/history", response: z.array(TraceEvent) },
  approvals: { method: "GET", path: "/api/approvals", response: z.array(Approval) },
  approvalApprove: { method: "POST", path: "/api/approvals/:id/approve", response: Approval },
  approvalDecline: { method: "POST", path: "/api/approvals/:id/decline", response: Approval },
  watches: { method: "GET", path: "/api/watches", response: z.array(Watch) },
  watchObservations: {
    method: "GET",
    path: "/api/watches/:id/observations",
    response: z.array(WatchObservation),
  },
  sendBriefing: { method: "POST", path: "/api/briefing/send", response: z.object({ sent: z.boolean(), to: z.string() }) },
} as const;
export type EndpointName = keyof typeof ENDPOINTS;
export type * from "./integrations";
