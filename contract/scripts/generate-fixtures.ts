/**
 * Generates contract/fixtures/*.sample.json from one hand-written scenario, using the shared landed-cost math.
 * Everything here is SAMPLE data (provenance "sample"): illustrative prices, not live offers.
 * Run: pnpm --filter @buyer/contract fixtures
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buysPerYear,
  currentUnitCostCents,
  deliveredCents,
  unitCostCents,
  unitsPerPurchase,
  savingPerBuyCents,
  yearlySavingsCents,
  type Approval,
  type Channel,
  type Health,
  type Household,
  type Item,
  type ItemSavings,
  type Offer,
  type Purchase,
  type Receipt,
  type SavingsRun,
  type TraceEvent,
  type Watch,
  type WatchObservation,
  SPONSORS,
} from "../src/index";
import { offerHash } from "../src/offer-hash";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
mkdirSync(outDir, { recursive: true });

const items: Item[] = [
  { id: "paper-towels", name: "Paper towels", brand: null, brandStrictness: "equivalent", unit: "sheet" },
  { id: "toilet-paper", name: "Toilet paper", brand: null, brandStrictness: "equivalent", unit: "sheet" },
  { id: "diapers", name: "Diapers (size 4)", brand: null, brandStrictness: "equivalent", unit: "diaper" },
  { id: "eggs", name: "Eggs", brand: null, brandStrictness: "equivalent", unit: "egg" },
  { id: "dish-soap", name: "Dish soap", brand: null, brandStrictness: "equivalent", unit: "oz" },
  { id: "batteries", name: "AA batteries", brand: "Duracell", brandStrictness: "exact", unit: "battery" },
];

type Line = { item: string; retailer: string; units: number; cents: number; qty?: number };
const schedule: { id: string; date: string; retailer: string; lines: Line[] }[] = [
  { id: "r01", date: "2026-08-03", retailer: "Amazon", lines: [
    { item: "paper-towels", retailer: "Amazon", units: 1560, cents: 2499 },
    { item: "dish-soap", retailer: "Amazon", units: 75, cents: 1197 },
    { item: "batteries", retailer: "Amazon", units: 48, cents: 1899 } ] },
  { id: "r02", date: "2026-08-05", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 749 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3499 } ] },
  { id: "r03", date: "2026-08-12", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 759 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3499 } ] },
  { id: "r04", date: "2026-08-16", retailer: "Costco", lines: [
    { item: "toilet-paper", retailer: "Costco", units: 11400, cents: 2399 },
    { item: "paper-towels", retailer: "Costco", units: 1920, cents: 2199 } ] },
  { id: "r05", date: "2026-08-19", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 749 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3599 } ] },
  { id: "r06", date: "2026-08-26", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 779 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3499 } ] },
  { id: "r07", date: "2026-08-30", retailer: "Amazon", lines: [
    { item: "dish-soap", retailer: "Amazon", units: 75, cents: 1249 },
    { item: "paper-towels", retailer: "Amazon", units: 1560, cents: 2599 } ] },
  { id: "r08", date: "2026-09-02", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 759 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3499 } ] },
  { id: "r09", date: "2026-09-06", retailer: "Costco", lines: [
    { item: "toilet-paper", retailer: "Costco", units: 11400, cents: 2399 } ] },
  { id: "r10", date: "2026-09-09", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 789 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3599 } ] },
  { id: "r11", date: "2026-09-16", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 749 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3499 } ] },
  { id: "r12", date: "2026-09-20", retailer: "Costco", lines: [
    { item: "toilet-paper", retailer: "Costco", units: 11400, cents: 2449 },
    { item: "paper-towels", retailer: "Costco", units: 1920, cents: 2199 } ] },
  { id: "r13", date: "2026-09-23", retailer: "GroceryCo", lines: [
    { item: "eggs", retailer: "GroceryCo", units: 18, cents: 769 },
    { item: "diapers", retailer: "GroceryCo", units: 92, cents: 3499 } ] },
  { id: "r14", date: "2026-09-27", retailer: "Amazon", lines: [
    { item: "dish-soap", retailer: "Amazon", units: 75, cents: 1297 },
    { item: "batteries", retailer: "Amazon", units: 48, cents: 1899 } ] },
];

const iso = (d: string, h = 15) => `${d}T${String(h).padStart(2, "0")}:00:00.000Z`;

const receipts: Receipt[] = schedule.map((r) => ({
  id: r.id,
  source: "seed",
  retailer: r.retailer,
  receivedAt: iso(r.date),
  triage: { isReceipt: true, via: "laya", confidence: 0.97 },
  reconciled: true,
  totalCents: r.lines.reduce((s, l) => s + l.cents, 0),
}));

const purchases: Purchase[] = schedule.flatMap((r) =>
  r.lines.map((l, i) => ({
    id: `${r.id}-${i + 1}`,
    itemId: l.item,
    receiptId: r.id,
    retailer: l.retailer,
    date: iso(r.date),
    quantity: l.qty ?? 1,
    normalizedUnits: l.units,
    lineTotalCents: l.cents,
  })),
);

const household: Household = { name: "Demo household", isDemoHousehold: true, receipts, items, purchases };

type OfferSpec = {
  channel: Channel;
  retailer: string;
  title: string;
  price: number;
  ship?: number;
  duty?: number;
  units: number;
  inStock?: boolean;
  excluded?: string;
};
const offerSpecs: Record<string, OfferSpec[]> = {
  "paper-towels": [
    { channel: "local", retailer: "Costco", title: "Kirkland Signature Create-A-Size, 12 rolls", price: 2199, units: 1920 },
    { channel: "shipped", retailer: "Amazon", title: "Amazon Basics Flex-Sheets, 12 double rolls", price: 2499, units: 1560 },
    { channel: "shipped", retailer: "Walmart", title: "Great Value Select-A-Size, 12 double rolls", price: 1999, ship: 599, units: 1440 },
    { channel: "long-haul", retailer: "OverseasMart", title: "Bulk towel carton, 6,000 sheets", price: 4200, ship: 1800, duty: 252, units: 6000 },
    { channel: "shipped", retailer: "FarmGoods", title: "Reusable cloth towels, sold by weight", price: 1800, units: 0, excluded: "can't normalize: sold by weight" },
  ],
  "toilet-paper": [
    { channel: "local", retailer: "Costco", title: "Kirkland Signature Bath Tissue, 30 rolls", price: 2399, units: 11400 },
    { channel: "shipped", retailer: "Amazon", title: "Amazon Basics Ultra Soft, 24 mega rolls", price: 2599, units: 6000 },
    { channel: "long-haul", retailer: "OverseasMart", title: "Bamboo tissue carton, 48 rolls", price: 3800, ship: 1900, duty: 228, units: 9600 },
  ],
  diapers: [
    { channel: "local", retailer: "Costco", title: "Kirkland Signature Diapers size 4, 204 ct", price: 4499, units: 204 },
    { channel: "shipped", retailer: "Amazon", title: "Pampers Swaddlers size 4, 152 ct", price: 4299, units: 152 },
    { channel: "long-haul", retailer: "OverseasMart", title: "Soft diapers size 4, 240 ct", price: 3200, ship: 1500, duty: 190, units: 240 },
    { channel: "shipped", retailer: "BabyDepot", title: "Huggies size 4, 120 ct", price: 2999, units: 120, inStock: false, excluded: "out of stock" },
  ],
  eggs: [
    { channel: "local", retailer: "Costco", title: "Kirkland Signature eggs, 60 ct", price: 1399, units: 60 },
    { channel: "shipped", retailer: "Amazon Fresh", title: "Large eggs, 24 ct", price: 1199, units: 24 },
    { channel: "local", retailer: "FarmStand", title: "Pastured eggs, by the pound", price: 900, units: 0, excluded: "can't normalize: sold by weight" },
  ],
  "dish-soap": [
    { channel: "local", retailer: "Costco", title: "Kirkland Signature Ultra, 2 x 78 oz", price: 1499, units: 156 },
    { channel: "shipped", retailer: "Walmart", title: "Great Value Ultra, 56 oz", price: 697, ship: 0, units: 56 },
    { channel: "long-haul", retailer: "OverseasMart", title: "Concentrate refill, 1 gal", price: 1100, ship: 1400, duty: 66, units: 128 },
  ],
  batteries: [
    { channel: "local", retailer: "Costco", title: "Kirkland Signature AA, 48 ct", price: 1799, units: 48, excluded: "brand mismatch (Duracell required)" },
    { channel: "shipped", retailer: "Amazon", title: "Duracell Coppertop AA, 48 ct", price: 1899, units: 48 },
    { channel: "shipped", retailer: "BatteryHub", title: "Duracell Coppertop AA, 72 ct", price: 2599, units: 72 },
  ],
};

const fetchedAt = iso("2026-10-04", 19);
const itemSavings: ItemSavings[] = items.map((item) => {
  const itemPurchases = purchases.filter((p) => p.itemId === item.id);
  const offers: Offer[] = offerSpecs[item.id].map((s, i) => {
    const delivered = deliveredCents({ priceCents: s.price, shippingCents: s.ship ?? 0, dutyEstimateCents: s.duty ?? 0 });
    return {
      id: `${item.id}-o${i + 1}`,
      itemId: item.id,
      channel: s.channel,
      retailer: s.retailer,
      url: `https://example.com/${s.retailer.toLowerCase().replace(/\W+/g, "-")}/${item.id}`,
      title: s.title,
      priceCents: s.price,
      shippingCents: s.ship ?? 0,
      dutyEstimateCents: s.duty ?? 0,
      deliveredCents: delivered,
      normalizedUnits: s.units,
      unitCostCents: s.units > 0 ? unitCostCents(delivered, s.units) : 0,
      inStock: s.inStock ?? true,
      fetchedAt,
      verifiedByKernel: false,
      excludedReason: s.excluded ?? null,
      provenance: "sample",
    };
  });
  const ranked = offers.filter((o) => o.excludedReason === null).sort((a, b) => a.unitCostCents - b.unitCostCents);
  const best = ranked[0] ?? null;
  const current = currentUnitCostCents(itemPurchases);
  const perPurchase = unitsPerPurchase(itemPurchases);
  const saving = best ? savingPerBuyCents(current, best.unitCostCents, perPurchase) : 0;
  const hist = buysPerYear(itemPurchases.map((p) => p.date));
  return {
    itemId: item.id,
    offers,
    currentUnitCostCents: current,
    bestOfferId: best?.id ?? null,
    unitsPerPurchase: perPurchase,
    savingPerBuyCents: saving,
    history: hist.enough
      ? { enough: true as const, buysPerYear: hist.buysPerYear, purchaseCount: hist.purchaseCount, spanDays: hist.spanDays }
      : { enough: false as const, reason: hist.reason, purchaseCount: hist.purchaseCount, spanDays: hist.spanDays },
    yearlySavingsCents: hist.enough ? yearlySavingsCents(saving, hist.buysPerYear) : null,
  };
});

const savings: SavingsRun = {
  id: "run-sample-1",
  startedAt: iso("2026-10-04", 19),
  finishedAt: iso("2026-10-04", 19),
  status: "done",
  items: itemSavings,
  yearlySavingsCents: itemSavings.reduce((s, i) => s + (i.yearlySavingsCents ?? 0), 0),
  inputs: {
    receiptCount: receipts.length,
    itemCount: items.length,
    includedItemCount: itemSavings.filter((i) => i.yearlySavingsCents !== null).length,
    channels: ["local", "shipped", "long-haul"],
    salesTaxIncluded: false,
    dutyIsEstimate: true,
  },
  provenance: "sample",
};

const capCents = 2500;
const underCap = itemSavings
  .filter((i) => i.bestOfferId)
  .map((i) => ({ i, o: i.offers.find((o) => o.id === i.bestOfferId)! }))
  .filter(({ o }) => o.deliveredCents <= capCents)
  .sort((a, b) => b.i.savingPerBuyCents - a.i.savingPerBuyCents)[0];
const approvals: Approval[] = underCap
  ? [
      {
        id: "appr-sample-1",
        itemId: underCap.i.itemId,
        offerId: underCap.o.id,
        offerHash: offerHash(underCap.o),
        merchant: underCap.o.retailer,
        amountCents: underCap.o.deliveredCents,
        capCents,
        status: "pending",
        blockedReason: null,
        mode: "review",
        createdAt: iso("2026-10-04", 19),
        decidedAt: null,
        checkout: null,
      },
    ]
  : [];

const trace: TraceEvent[] = [
  ["agentmail", "Receipt received from inbox", 120],
  ["laya", "Triage: receipt (0.97)", 28],
  ["mastra", "Parsed 3 line items, totals reconcile", 2100],
  ["neon", "Wrote 3 purchases", 40],
  ["exa", "Searched local / shipped / long-haul for 6 items", 4800],
  ["executor", "exa.search allowed by policy", 15],
  ["mastra", "Computed landed cost and ranked offers", 12],
  ["kernel", "Verified top offer price (read-only)", 5200],
].map(([sponsor, label, durationMs], i) => ({
  id: `t${i + 1}`,
  at: iso("2026-10-04", 19),
  sponsor: sponsor as TraceEvent["sponsor"],
  label: label as string,
  status: "ok" as const,
  durationMs: durationMs as number,
  provenance: "sample" as const,
  ...(sponsor === "executor" ? { policy: "allow" as const } : {}),
}));

const watches: Watch[] = itemSavings
  .filter((i) => i.bestOfferId)
  .slice(0, 3)
  .map((i, n) => ({
    id: `w${n + 1}`,
    itemId: i.itemId,
    offerUrl: i.offers.find((o) => o.id === i.bestOfferId)!.url,
    startedAt: iso("2026-10-04", 20),
    observationCount: 190,
    lastCheckedAt: iso("2026-10-04", 23),
    runsOn: "sprite" as const,
    lastPriceCents: i.offers.find((o) => o.id === i.bestOfferId)!.priceCents,
  }));

const watchObservations: WatchObservation[] = Array.from({ length: 24 }, (_, n) => ({
  id: `obs${n + 1}`,
  watchId: "w1",
  at: new Date(Date.parse(iso("2026-10-04", 20)) + n * 10 * 60_000).toISOString(),
  priceCents: (watches[0]?.lastPriceCents ?? 0) + (n % 7 === 3 ? 100 : 0),
  inStock: true,
}));

const health: Health = {
  ok: true,
  checkedAt: iso("2026-10-04", 19),
  checkoutMode: "review",
  services: SPONSORS.filter((s) => s !== "system").map((sponsor) => ({
    sponsor,
    status: "green" as const,
    note: "sample",
    usingFallback: false,
  })),
};

const files: Record<string, unknown> = {
  "household.sample.json": household,
  "savings.sample.json": savings,
  "approvals.sample.json": approvals,
  "trace.sample.json": trace,
  "watches.sample.json": watches,
  "watch-observations.sample.json": watchObservations,
  "health.sample.json": health,
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2) + "\n");
}
console.log(
  `wrote ${Object.keys(files).length} fixtures; yearly savings ${savings.yearlySavingsCents} cents; included ${savings.inputs.includedItemCount}/${items.length}`,
);
