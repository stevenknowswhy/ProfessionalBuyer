/**
 * Price-watch worker. For each active watch: fetch the offer page, record a watch_observations row and an
 * events row tagged `fly`. Talks only to Neon (never to the agent server), so it runs the same on a laptop
 * and on a Fly Sprite. Without DATABASE_URL it runs in dry-run mode and only logs.
 */
import http from "node:http";
import { runCycle } from "./cycle";
import { onSprite, startKeepAwake } from "./keep-awake";
import { DryRunStore, PgStore, type Store, type WatchRow } from "./store";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 120_000);
const MAX_CYCLES = Number(process.env.WORKER_MAX_CYCLES ?? 0);
const PORT = Number(process.env.PORT ?? process.env.WORKER_HTTP_PORT ?? 0);

const runsOn: WatchRow["runsOn"] = onSprite() ? "sprite" : "local";
const dbUrl = process.env.DATABASE_URL?.trim();
const store: Store = dbUrl ? new PgStore(dbUrl) : new DryRunStore();

const status = { startedAt: new Date().toISOString(), runsOn, mode: store.kind, cycles: 0, observations: 0, lastCycleAt: null as string | null };

function startStatusServer() {
  if (!PORT) return undefined;
  // Public on a Sprite URL: serves counters only, never env or logs. A request also wakes a paused Sprite.
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...status }));
  });
  server.listen(PORT, () => console.log(`[worker] status on :${PORT}`));
  return server;
}

async function main() {
  console.log(`[worker] start runsOn=${runsOn} store=${store.kind} interval=${INTERVAL_MS}ms${MAX_CYCLES ? ` maxCycles=${MAX_CYCLES}` : ""}`);
  if (store.kind === "dry-run") console.log("[worker] DATABASE_URL not set: dry-run mode, observations are logged, not written");

  const seeded = await store.seedIfEmpty(runsOn);
  if (seeded.inserted) console.log(`[worker] seeded ${seeded.inserted} watches from ${seeded.source}`);
  if (runsOn === "sprite") await store.markRunsOn("sprite");

  const keepAwake = startKeepAwake();
  const server = startStatusServer();
  let stopping = false;
  let wake: (() => void) | undefined;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    wake?.();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  while (!stopping) {
    const t0 = Date.now();
    try {
      const n = await runCycle(store, runsOn);
      status.cycles++;
      status.observations += n;
      status.lastCycleAt = new Date().toISOString();
      console.log(`[worker] cycle ${status.cycles}: ${n} observations in ${Date.now() - t0}ms (total ${status.observations})`);
    } catch (err) {
      console.error(`[worker] cycle failed: ${err instanceof Error ? err.message : err}`);
    }
    if (MAX_CYCLES && status.cycles >= MAX_CYCLES) break;
    await new Promise<void>((r) => {
      wake = r;
      setTimeout(r, Math.max(0, INTERVAL_MS - (Date.now() - t0)));
    });
  }

  await keepAwake.stop();
  server?.close();
  await store.close();
  console.log("[worker] stopped");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
