import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Approval,
  ENDPOINTS,
  Health,
  Household,
  SavingsRun,
  TraceEvent,
  Watch,
  WatchObservation,
  buysPerYear,
  deliveredCents,
  savingPerBuyCents,
  unitCostCents,
  yearlySavingsCents,
} from "./index";
import { offerHash } from "./offer-hash";
import { z } from "zod";

const fx = (name: string) =>
  JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", name), "utf8"));

test("delivered cost adds price, shipping and duty estimate", () => {
  assert.equal(deliveredCents({ priceCents: 2000, shippingCents: 500, dutyEstimateCents: 100 }), 2600);
});

test("unit cost divides by normalized units and rejects zero", () => {
  assert.equal(unitCostCents(2400, 1200), 2);
  assert.throws(() => unitCostCents(100, 0));
});

test("saving per buy is clipped at zero", () => {
  assert.equal(savingPerBuyCents(2, 1.5, 100), 50);
  assert.equal(savingPerBuyCents(1, 2, 100), 0);
});

test("buys per year uses n-1 intervals", () => {
  const v = buysPerYear(["2026-08-01T00:00:00Z", "2026-08-15T00:00:00Z", "2026-08-29T00:00:00Z"]);
  assert.ok(v.enough);
  if (v.enough) assert.equal(Math.round(v.buysPerYear), Math.round((2 / 28) * 365));
});

test("fewer than 3 purchases or under 14 days is excluded with a reason", () => {
  const two = buysPerYear(["2026-08-01T00:00:00Z", "2026-09-01T00:00:00Z"]);
  assert.equal(two.enough, false);
  const short = buysPerYear(["2026-08-01T00:00:00Z", "2026-08-05T00:00:00Z", "2026-08-09T00:00:00Z"]);
  assert.equal(short.enough, false);
  if (!short.enough) assert.match(short.reason, /not enough history/);
});

test("fixtures validate against the schemas", () => {
  Household.parse(fx("household.sample.json"));
  SavingsRun.parse(fx("savings.sample.json"));
  z.array(Approval).parse(fx("approvals.sample.json"));
  z.array(TraceEvent).parse(fx("trace.sample.json"));
  z.array(Watch).parse(fx("watches.sample.json"));
  z.array(WatchObservation).parse(fx("watch-observations.sample.json"));
  Health.parse(fx("health.sample.json"));
});

test("sample savings recompute from their own inputs", () => {
  const run = SavingsRun.parse(fx("savings.sample.json"));
  let total = 0;
  for (const s of run.items) {
    for (const o of s.offers) {
      assert.equal(o.deliveredCents, o.priceCents + o.shippingCents + o.dutyEstimateCents);
      if (!o.excludedReason) assert.ok(Math.abs(o.unitCostCents - o.deliveredCents / o.normalizedUnits) < 1e-9);
    }
    if (s.history.enough) {
      assert.equal(s.yearlySavingsCents, yearlySavingsCents(s.savingPerBuyCents, s.history.buysPerYear));
      total += s.yearlySavingsCents ?? 0;
    } else {
      assert.equal(s.yearlySavingsCents, null);
    }
  }
  assert.equal(run.yearlySavingsCents, total);
  assert.ok(run.yearlySavingsCents > 0);
  assert.ok(run.items.some((i) => !i.history.enough), "sample shows at least one excluded item");
  assert.ok(run.items.some((i) => i.offers.some((o) => o.excludedReason)), "sample shows excluded offers");
});

test("sample approval hash matches its offer and respects the cap", () => {
  const [a] = z.array(Approval).parse(fx("approvals.sample.json"));
  const run = SavingsRun.parse(fx("savings.sample.json"));
  const offer = run.items.flatMap((i) => i.offers).find((o) => o.id === a.offerId)!;
  assert.equal(a.offerHash, offerHash(offer));
  assert.ok(a.amountCents <= a.capCents);
});

test("endpoint paths are unique", () => {
  const keys = Object.values(ENDPOINTS).map((e) => `${e.method} ${e.path}`);
  assert.equal(new Set(keys).size, keys.length);
});
