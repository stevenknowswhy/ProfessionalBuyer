import { buysPerYear, yearlySavingsCents, type Household, type Item } from "@buyer/contract";
import { catalogStore, matchRetailer, type StoreGroupId } from "@/lib/stores";

export type Lane = "local" | "online" | "overseas";

export const LANES: { id: Lane; label: string; hint: string }[] = [
  { id: "local", label: "Local", hint: "Store price, no shipping" },
  { id: "online", label: "Online", hint: "Shipped to you" },
  { id: "overseas", label: "Overseas", hint: "Long-haul, duty may apply" },
];

export type ReceiptLine = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lineTotalCents: number;
};

export type ComparedOffer = {
  storeId: string;
  storeName: string;
  lane: Lane;
  title: string;
  url: string | null;
  deliveredCents: number | null;
  shippingCents: number;
  dutyCents: number;
  match: number | null;
  provenance: "sample" | "live";
};

export const FREQUENCIES = [
  { id: "week", label: "Every week", perYear: 52 },
  { id: "two-weeks", label: "Every two weeks", perYear: 26 },
  { id: "month", label: "Every month", perYear: 12 },
  { id: "two-months", label: "Every two months", perYear: 6 },
  { id: "quarter", label: "Every quarter", perYear: 4 },
] as const;

const STOP = new Set(["the", "and", "with", "for", "size", "pack", "count", "from", "your"]);

export function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

/** Share of the shorter name's words that appear in the other name. */
export function nameScore(a: string, b: string): number {
  const left = words(a);
  const right = new Set(words(b));
  if (left.length === 0 || right.size === 0) return 0;
  const hit = left.filter((word) => right.has(word)).length;
  return hit / Math.min(left.length, right.size);
}

export function bestItemMatch(
  name: string,
  items: Pick<Item, "id" | "name">[],
): { id: string; name: string; score: number } | null {
  let best: { id: string; name: string; score: number } | null = null;
  for (const item of items) {
    const score = nameScore(name, item.name);
    if (score >= 0.5 && (!best || score > best.score)) best = { id: item.id, name: item.name, score };
  }
  return best;
}

export function laneFromChannel(channel: "local" | "shipped" | "long-haul"): Lane {
  if (channel === "local") return "local";
  if (channel === "shipped") return "online";
  return "overseas";
}

export function laneForStore(id: string, group?: StoreGroupId): Lane {
  if (id === "temu") return "overseas";
  if (id === "amazon" || id === "ebay" || id === "etsy" || group === "marketplace") return "online";
  const store = catalogStore(id);
  if (store?.group === "marketplace") return store.id === "temu" ? "overseas" : "online";
  return "local";
}

export function parseDollarCents(text: string): number | null {
  const match = text.match(/\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/);
  if (!match) return null;
  const cents = Math.round(Number(match[1].replace(/,/g, "")) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** Close enough that Jev thinks the listing is the purchased item. */
export const MATCH_FLOOR = 0.55;

export function bestPriced(offers: ComparedOffer[]): ComparedOffer | null {
  const priced = offers.filter((offer) => offer.deliveredCents != null && (offer.match == null || offer.match >= MATCH_FLOOR));
  if (priced.length === 0) return null;
  return priced.reduce((best, offer) => (offer.deliveredCents! < best.deliveredCents! ? offer : best));
}

export function saveThisBuyCents(paidCents: number, best: ComparedOffer | null): number {
  if (!best || best.deliveredCents == null) return 0;
  return Math.max(0, paidCents - best.deliveredCents);
}

export function historyForItem(household: Household | undefined, itemId: string | null) {
  if (!household || !itemId) return null;
  const dates = household.purchases.filter((purchase) => purchase.itemId === itemId).map((purchase) => purchase.date);
  if (dates.length === 0) return null;
  return buysPerYear(dates);
}

export function yearSavings(saveOnceCents: number, perYear: number): number {
  return yearlySavingsCents(saveOnceCents, perYear);
}

export function sampleLines(household: Household): { retailer: string; lines: ReceiptLine[] } {
  const receipt = [...household.receipts].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0];
  const items = new Map(household.items.map((item) => [item.id, item]));
  const lines = household.purchases
    .filter((purchase) => purchase.receiptId === receipt?.id)
    .map((purchase) => ({
      id: purchase.id,
      name: items.get(purchase.itemId)?.name ?? purchase.itemId,
      quantity: purchase.quantity,
      unit: items.get(purchase.itemId)?.unit ?? "unit",
      lineTotalCents: purchase.lineTotalCents,
    }));
  return { retailer: receipt?.retailer ?? "Sample", lines };
}
