import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG } from "./stores.ts";
import {
  buildNearbyStores,
  capNearby,
  hostMatches,
  NEARBY_CAP,
  rankedNearby,
  selectNearbyStores,
  verifyRetailSite,
  type NearbyAddress,
  type NearbyStore,
} from "./nearby-stores.ts";

const GROUPS = new Set(["big-box", "grocery", "pharmacy", "home", "dollar"]);
const BLOCKED = new Set(["ebay", "temu", "etsy", "rite-aid"]);

function address(city: string, region: string, postalCode: string): NearbyAddress {
  return {
    addressLine: "100 Main Street",
    city,
    region,
    postalCode,
    country: "United States",
  };
}

function ids(stores: readonly NearbyStore[]): string[] {
  return stores.map((store) => store.id);
}

function assertCatalogShape(stores: readonly NearbyStore[]) {
  assert.ok(stores.length <= NEARBY_CAP);
  assert.equal(new Set(ids(stores)).size, stores.length);
  for (const store of stores) {
    const catalog = CATALOG.find((item) => item.id === store.id);
    assert.ok(catalog, store.id);
    assert.equal(catalog?.name, store.name);
    assert.equal(catalog?.group, store.group);
    assert.equal(catalog?.url, store.url);
    assert.ok(catalog?.domains.includes(store.domain));
    assert.ok(GROUPS.has(store.group));
    assert.equal(store.url.startsWith("https://"), true);
    assert.equal(hostMatches(store.url, store.domain), true);
    assert.ok(store.reason.length > 10);
    assert.equal(/\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard)\b/i.test(store.reason), false);
    assert.equal(BLOCKED.has(store.id), false);
  }
}

test("San Francisco and Houston do not share a store list", () => {
  const sanFrancisco = selectNearbyStores({ city: "San Francisco", region: "CA", country: "United States" });
  const houston = selectNearbyStores({ city: "Houston", region: "TX", country: "United States" });
  assertCatalogShape(sanFrancisco);
  assertCatalogShape(houston);
  assert.notDeepEqual(ids(sanFrancisco), ids(houston));
  assert.equal(sanFrancisco.length, NEARBY_CAP);
  assert.equal(houston.length, NEARBY_CAP);
  assert.equal(sanFrancisco[0]?.id, "costco");
  assert.equal(houston[0]?.id, "costco");
  assert.equal(sanFrancisco.at(-1)?.id, "amazon");
  assert.equal(houston.at(-1)?.id, "amazon");
  assert.match(sanFrancisco.at(-1)?.reason ?? "", /online/i);
  assert.match(houston.at(-1)?.reason ?? "", /online/i);

  for (const id of ["safeway", "grocery-outlet", "smart-final", "lucky"]) {
    assert.ok(ids(sanFrancisco).includes(id), id);
    assert.equal(ids(houston).includes(id), false, id);
  }
  for (const id of ["heb", "kroger", "fiesta", "randalls", "central-market"]) {
    assert.ok(ids(houston).includes(id), id);
    assert.equal(ids(sanFrancisco).includes(id), false, id);
  }
  for (const id of ["publix", "wegmans", "meijer", "bjs", "ebay", "temu", "etsy", "rite-aid"]) {
    assert.equal(ids(sanFrancisco).includes(id), false, id);
    assert.equal(ids(houston).includes(id), false, id);
  }
});

test("regional grocers stay inside their footprint", () => {
  const miami = ids(selectNearbyStores({ city: "Miami", region: "FL", country: "United States" }));
  const boston = ids(selectNearbyStores({ city: "Boston", region: "Massachusetts", country: "United States" }));
  const detroit = ids(selectNearbyStores({ city: "Detroit", region: "MI", country: "United States" }));
  const dallas = ids(selectNearbyStores({ city: "Dallas", region: "TX", country: "United States" }));
  const houston = ids(selectNearbyStores({ city: "Houston", region: "TX", country: "United States" }));
  assert.ok(miami.includes("publix"));
  assert.equal(miami.includes("heb"), false);
  assert.equal(miami.includes("wegmans"), false);
  assert.ok(boston.includes("wegmans"));
  assert.equal(boston.includes("publix"), false);
  assert.equal(boston.includes("meijer"), false);
  assert.ok(detroit.includes("meijer"));
  assert.equal(detroit.includes("publix"), false);
  assert.ok(dallas.includes("bjs"));
  assert.equal(houston.includes("bjs"), false);
  assert.notDeepEqual(miami, boston);
});

test("a short verified list is not padded to 20", async () => {
  const result = await buildNearbyStores(address("Houston", "TX", "77002"), {
    geocode: async () => null,
    verify: async (store) => store.id === "heb" || store.id === "walmart",
  });
  assert.deepEqual(ids(result.stores), ["walmart", "heb"]);
  assert.equal(result.stores.length, 2);
  assert.equal(result.city, "Houston");
  assert.equal(result.region, "TX");
});

test("stores that fail the site check are dropped", async () => {
  const result = await buildNearbyStores(address("San Francisco", "CA", "94103"), {
    geocode: async () => null,
    verify: async () => false,
  });
  assert.deepEqual(result.stores, []);
});

test("geocoded state wins when it differs from the typed region", async () => {
  const result = await buildNearbyStores(address("San Francisco", "CA", "94103"), {
    geocode: async () => ({ city: "Houston", region: "TX" }),
    verify: async () => true,
  });
  assert.equal(result.region, "TX");
  assert.ok(ids(result.stores).includes("heb"));
  assert.equal(ids(result.stores).includes("safeway"), false);
});

test("addresses outside the United States get no invented stores", async () => {
  const result = await buildNearbyStores(
    { ...address("Berlin", "Berlin", "10115"), country: "Germany" },
    { verify: async () => true, geocode: async () => ({ city: "Berlin", region: "BE" }) },
  );
  assert.deepEqual(result.stores, []);
});

test("verifyRetailSite requires https, a live status, and the store host", async () => {
  const ok = await verifyRetailSite("https://www.heb.com/shop", "heb.com", async () => {
    const response = new Response("<html>search departments</html>", { status: 200 });
    Object.defineProperty(response, "url", { value: "https://www.heb.com/shop" });
    return response;
  });
  const blocked = await verifyRetailSite("https://www.kroger.com", "kroger.com", async () => {
    const response = new Response("forbidden", { status: 403 });
    Object.defineProperty(response, "url", { value: "https://www.kroger.com/" });
    return response;
  });
  const down = await verifyRetailSite("https://www.publix.com", "publix.com", async () => new Response("no", { status: 503 }));
  const social = await verifyRetailSite("https://example.com", "example.com", async () => {
    const response = new Response("closed", { status: 200 });
    Object.defineProperty(response, "url", { value: "https://www.facebook.com/publix" });
    return response;
  });
  const http = await verifyRetailSite("http://www.aldi.us", "aldi.us", async () => new Response("ok", { status: 200 }));
  assert.equal(ok, true);
  assert.equal(blocked, true);
  assert.equal(down, false);
  assert.equal(social, false);
  assert.equal(http, false);
});

test("the cap keeps one online store and never exceeds 20", () => {
  const ranked = rankedNearby({ city: "Houston", region: "TX", country: "United States" });
  assert.ok(ranked.length > NEARBY_CAP);
  const capped = capNearby(ranked);
  assert.equal(capped.length, NEARBY_CAP);
  assert.equal(capped.filter((store) => store.id === "amazon").length, 1);
  assert.equal(capped.at(-1)?.id, "amazon");
  assert.ok(capped.filter((store) => store.id !== "amazon").length <= NEARBY_CAP - 1);
});
