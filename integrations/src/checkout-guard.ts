/**
 * Money-safety checks for Kernel checkout. Pure functions so the abort rules are unit-tested without a browser.
 * A completed Vault fill is not proof of the amount: the order-review total read from the page is what we check.
 */

export type TotalCheck = { ok: true } | { ok: false; reason: string };

/** Exact match in integer cents. Anything else, including an unreadable total, aborts. */
export function checkPageTotal(pageTotalCents: number | null, expectedTotalCents: number): TotalCheck {
  if (!Number.isInteger(expectedTotalCents) || expectedTotalCents <= 0) {
    return { ok: false, reason: `expected total must be a positive integer of cents, got ${expectedTotalCents}` };
  }
  if (pageTotalCents === null || !Number.isInteger(pageTotalCents)) {
    return { ok: false, reason: "could not read the order total on the review page" };
  }
  if (pageTotalCents !== expectedTotalCents) {
    return {
      ok: false,
      reason: `page total ${formatCents(pageTotalCents)} differs from approved ${formatCents(expectedTotalCents)}`,
    };
  }
  return { ok: true };
}

/** What checkout may do next once the total is known. `place` is only reachable when the totals match. */
export function nextCheckoutStep(
  mode: "review" | "place",
  check: TotalCheck,
): { action: "abort"; reason: string } | { action: "stop-at-review" } | { action: "place-order" } {
  if (!check.ok) return { action: "abort", reason: check.reason };
  return mode === "place" ? { action: "place-order" } : { action: "stop-at-review" };
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}
