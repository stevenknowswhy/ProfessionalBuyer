import assert from "node:assert/strict";
import test from "node:test";
import { bestItemMatch, bestPriced, laneForStore, parseDollarCents, saveThisBuyCents, yearSavings } from "./receipt.ts";

test("a receipt line matches the household item by shared words", () => {
  const match = bestItemMatch("Kirkland paper towels 12 rolls", [
    { id: "paper-towels", name: "Paper towels" },
    { id: "dish-soap", name: "Dish soap" },
  ]);
  assert.equal(match?.id, "paper-towels");
});

test("Temu is overseas, eBay is online, Costco is local", () => {
  assert.equal(laneForStore("temu", "marketplace"), "overseas");
  assert.equal(laneForStore("ebay", "marketplace"), "online");
  assert.equal(laneForStore("costco", "big-box"), "local");
});

test("a dollar amount in a listing becomes cents", () => {
  assert.equal(parseDollarCents("12 rolls now $21.99 at the warehouse"), 2199);
  assert.equal(parseDollarCents("no price listed"), null);
});

test("one-time and yearly savings use the closest priced match", () => {
  const offers = [
    { storeId: "a", storeName: "A", lane: "local" as const, title: "", url: null, deliveredCents: 2500, shippingCents: 0, dutyCents: 0, match: 0.9, provenance: "sample" as const },
    { storeId: "b", storeName: "B", lane: "online" as const, title: "", url: null, deliveredCents: 1800, shippingCents: 0, dutyCents: 0, match: 0.2, provenance: "sample" as const },
    { storeId: "c", storeName: "C", lane: "overseas" as const, title: "", url: null, deliveredCents: 2000, shippingCents: 0, dutyCents: 0, match: 0.8, provenance: "live" as const },
  ];
  const best = bestPriced(offers);
  assert.equal(best?.storeId, "c");
  assert.equal(saveThisBuyCents(2499, best), 499);
  assert.equal(yearSavings(499, 8), Math.round(499 * 8));
});
