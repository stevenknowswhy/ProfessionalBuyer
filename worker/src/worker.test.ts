import { test } from "node:test";
import assert from "node:assert/strict";
import { runCycle } from "./cycle";
import { assertExistingSprite, assertSpriteUrl, SPRITE_TARGET } from "./sprite-target";
import { DryRunStore, sampleRun, watchSeedsFromRun, type EventInput, type ObservationInput } from "./store";

test("the worker targets the existing buyer-worker sprite and will not invent one", () => {
  assert.equal(SPRITE_TARGET.org, "stefano94120");
  assert.equal(SPRITE_TARGET.name, "buyer-worker");
  assert.equal(SPRITE_TARGET.url, "https://buyer-worker-b3y4b.sprites.app");
  assert.doesNotThrow(() => assertExistingSprite(["web-terminal", "buyer-worker"]));
  assert.throws(() => assertExistingSprite(["web-terminal"]), /Refusing to create/);
  assert.throws(() => assertSpriteUrl("https://other.sprites.app"), /Refusing to deploy/);
  assert.doesNotThrow(() => assertSpriteUrl("https://buyer-worker-b3y4b.sprites.app/"));
});

test("seeds one watch per featured item from the sample savings run", () => {
  const seeds = watchSeedsFromRun(sampleRun());
  assert.equal(seeds.length, sampleRun().items.filter((i) => i.bestOfferId).length);
  assert.ok(seeds.every((s) => s.offerUrl.startsWith("http")));
});

test("a cycle writes one observation and one fly event per watch, including failed fetches", async () => {
  const store = new DryRunStore();
  const obs: ObservationInput[] = [];
  const events: EventInput[] = [];
  store.insertObservation = async (o) => (obs.push(o), "obs_x");
  store.insertEvent = async (e) => (events.push(e), "evt_x");
  const log = console.log;
  console.log = () => {};
  try {
    await store.seedIfEmpty("local");
  } finally {
    console.log = log;
  }
  const watches = await store.activeWatches();

  let i = 0;
  const n = await runCycle(store, "local", async () => {
    const fail = i++ === 0;
    return fail
      ? { priceCents: null, inStock: false, source: "none", httpStatus: null, durationMs: 3, error: "timeout" }
      : { priceCents: 1999, inStock: true, source: "json-ld", httpStatus: 200, durationMs: 5, error: null };
  });

  assert.equal(n, watches.length);
  assert.equal(obs.length, watches.length);
  assert.equal(events.length, watches.length);
  assert.deepEqual(obs[0], { watchId: watches[0]!.id, priceCents: null, inStock: false });
  assert.equal(events[0]!.status, "error");
  assert.equal(events[1]!.status, "ok");
  assert.equal(events[1]!.detail.priceCents, 1999);
  assert.equal(events[1]!.detail.runsOn, "local");
});
