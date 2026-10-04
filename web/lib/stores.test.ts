import assert from "node:assert/strict";
import test from "node:test";
import { addStoreLink, DEFAULT_SELECTION, matchRetailer, retailerCoverage, storesMatching } from "./stores.ts";

test("eBay, Temu, and Etsy are searched by default", () => {
  for (const id of ["ebay", "temu", "etsy"]) {
    assert.equal(retailerCoverage(id === "ebay" ? "eBay" : id === "temu" ? "Temu" : "Etsy", DEFAULT_SELECTION.selectedIds), "in");
  }
});

test("a pasted Costco product link selects Costco", () => {
  const cleared = { selectedIds: [], custom: [] };
  const result = addStoreLink(cleared, "https://www.costco.com/kirkland-diapers.product.123.html");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.selection.selectedIds, ["costco"]);
  assert.match(result.message, /Costco/);
});

test("a pasted link for an unknown shop becomes a custom store", () => {
  const result = addStoreLink(DEFAULT_SELECTION, "shop.neighborhood.example/paper");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.selection.custom[0]?.host, "shop.neighborhood.example");
  assert.ok(result.selection.selectedIds.includes("custom:shop.neighborhood.example"));
});

test("filter finds Temu and the big box group", () => {
  assert.deepEqual(
    storesMatching("temu", "all", []).map((store) => store.id),
    ["temu"],
  );
  const bigBox = storesMatching("", "big-box", []).map((store) => store.id);
  assert.ok(bigBox.includes("walmart") && bigBox.includes("costco"));
  assert.ok(!bigBox.includes("etsy"));
});

test("Amazon Fresh counts as Amazon", () => {
  assert.equal(matchRetailer("Amazon Fresh"), "amazon");
  assert.equal(retailerCoverage("Costco", []), "out");
  assert.equal(retailerCoverage("OverseasMart", ["costco"]), "unknown");
});
