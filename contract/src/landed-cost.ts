/**
 * Landed-cost math. The single source of truth for every dollar figure in the product.
 * Money is integer cents. Rules are specified in PLAN.md section 4.
 */

export const MIN_PURCHASES = 3;
export const MIN_SPAN_DAYS = 14;
const DAYS_PER_YEAR = 365;

export function deliveredCents(input: {
  priceCents: number;
  shippingCents: number;
  dutyEstimateCents: number;
}): number {
  return input.priceCents + input.shippingCents + input.dutyEstimateCents;
}

/** Cost of one normalized unit (one sheet, one diaper, one egg), in cents. Fractional on purpose. */
export function unitCostCents(deliveredCostCents: number, normalizedUnits: number): number {
  if (!(normalizedUnits > 0)) throw new Error("normalizedUnits must be > 0");
  return deliveredCostCents / normalizedUnits;
}

/** Saving for one purchase event. Never negative: if the current source is already best, saving is 0. */
export function savingPerBuyCents(
  currentUnitCostCents: number,
  bestUnitCostCents: number,
  unitsPerPurchase: number,
): number {
  return Math.round(Math.max(0, currentUnitCostCents - bestUnitCostCents) * unitsPerPurchase);
}

export type HistoryVerdict =
  | { enough: true; buysPerYear: number; purchaseCount: number; spanDays: number }
  | { enough: false; reason: string; purchaseCount: number; spanDays: number };

/**
 * Purchase cadence from dated purchases. n purchases span n-1 intervals,
 * so buys per year is (n-1) / spanDays * 365, not n / spanDays * 365.
 */
export function buysPerYear(purchaseDates: string[]): HistoryVerdict {
  const times = purchaseDates.map((d) => Date.parse(d)).sort((a, b) => a - b);
  if (times.some(Number.isNaN)) throw new Error("invalid purchase date");
  const n = times.length;
  const spanDays = n < 2 ? 0 : (times[n - 1] - times[0]) / 86_400_000;
  if (n < MIN_PURCHASES || spanDays < MIN_SPAN_DAYS) {
    return {
      enough: false,
      reason: `not enough history (${n} purchases over ${Math.floor(spanDays)} days; need ${MIN_PURCHASES} over ${MIN_SPAN_DAYS})`,
      purchaseCount: n,
      spanDays,
    };
  }
  return {
    enough: true,
    buysPerYear: ((n - 1) / spanDays) * DAYS_PER_YEAR,
    purchaseCount: n,
    spanDays,
  };
}

export function yearlySavingsCents(savingPerBuy: number, perYear: number): number {
  return Math.round(savingPerBuy * perYear);
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** What the household pays per normalized unit today: pooled over the three most recent purchases. */
export function currentUnitCostCents(
  purchases: { date: string; lineTotalCents: number; normalizedUnits: number }[],
): number {
  const recent = [...purchases].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);
  const cents = recent.reduce((s, p) => s + p.lineTotalCents, 0);
  const units = recent.reduce((s, p) => s + p.normalizedUnits, 0);
  return unitCostCents(cents, units);
}

/** Typical size of one purchase, in normalized units (mean over history). */
export function unitsPerPurchase(purchases: { normalizedUnits: number }[]): number {
  return purchases.reduce((s, p) => s + p.normalizedUnits, 0) / purchases.length;
}
