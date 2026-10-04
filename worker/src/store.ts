import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Household, SavingsRun } from "@buyer/contract";
import savingsSample from "@buyer/contract/fixtures/savings.sample.json" with { type: "json" };
import householdSample from "@buyer/contract/fixtures/household.sample.json" with { type: "json" };

export interface WatchRow {
  id: string;
  itemId: string;
  offerUrl: string;
  runsOn: "sprite" | "local";
}

export interface ObservationInput {
  watchId: string;
  priceCents: number | null;
  inStock: boolean;
}

export interface EventInput {
  label: string;
  status: "ok" | "error" | "skipped";
  durationMs: number;
  provenance: "live" | "sample";
  detail: Record<string, unknown>;
}

export interface Store {
  readonly kind: "neon" | "dry-run";
  /** Inserts one watch per featured item's best offer when there are no active watches. Returns how many and from where. */
  seedIfEmpty(runsOn: WatchRow["runsOn"]): Promise<{ inserted: number; source: string }>;
  markRunsOn(runsOn: WatchRow["runsOn"]): Promise<void>;
  activeWatches(): Promise<WatchRow[]>;
  insertObservation(o: ObservationInput): Promise<string>;
  insertEvent(e: EventInput): Promise<string>;
  close(): Promise<void>;
}

export const newId = (prefix: string) => `${prefix}_${randomUUID()}`;

/** Featured items: those with a best offer. Same rule whether the run comes from Neon or the sample fixture. */
export function watchSeedsFromRun(run: Pick<SavingsRun, "items">): { itemId: string; offerUrl: string }[] {
  const seeds: { itemId: string; offerUrl: string }[] = [];
  for (const item of run.items) {
    const best = item.offers.find((o) => o.id === item.bestOfferId);
    if (best) seeds.push({ itemId: item.itemId, offerUrl: best.url });
  }
  return seeds;
}

export function sampleRun(): SavingsRun {
  return savingsSample as SavingsRun;
}

export class PgStore implements Store {
  readonly kind = "neon" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 2, ssl: /sslmode=disable/.test(connectionString) ? false : { rejectUnauthorized: false } });
    this.pool.on("error", (err) => console.error(`[worker] pg pool error: ${err.message}`));
  }

  async seedIfEmpty(runsOn: WatchRow["runsOn"]) {
    const { rows } = await this.pool.query<{ n: number }>("SELECT count(*)::int AS n FROM watches WHERE active");
    if (rows[0]!.n > 0) return { inserted: 0, source: "existing watches" };

    const latest = await this.pool.query<{ id: string; body: SavingsRun }>(
      "SELECT id, body FROM savings_runs WHERE status = 'done' ORDER BY started_at DESC LIMIT 1",
    );
    let source: string;
    let seeds: { itemId: string; offerUrl: string }[];
    if (latest.rows[0]) {
      source = `savings_runs ${latest.rows[0].id}`;
      seeds = watchSeedsFromRun(latest.rows[0].body);
    } else {
      source = "contract/fixtures/savings.sample.json (sample)";
      seeds = watchSeedsFromRun(sampleRun());
      // watches.item_id references items; before core seeds the household, add the sample items it needs.
      const household = householdSample as Household;
      for (const it of household.items.filter((i) => seeds.some((s) => s.itemId === i.id))) {
        await this.pool.query(
          "INSERT INTO items (id, name, brand, brand_strictness, unit) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
          [it.id, it.name, it.brand, it.brandStrictness, it.unit],
        );
      }
    }
    for (const s of seeds) {
      await this.pool.query("INSERT INTO watches (id, item_id, offer_url, runs_on, active) VALUES ($1, $2, $3, $4, true)", [
        newId("watch"),
        s.itemId,
        s.offerUrl,
        runsOn,
      ]);
    }
    return { inserted: seeds.length, source };
  }

  async markRunsOn(runsOn: WatchRow["runsOn"]) {
    await this.pool.query("UPDATE watches SET runs_on = $1 WHERE active AND runs_on <> $1", [runsOn]);
  }

  async activeWatches(): Promise<WatchRow[]> {
    const { rows } = await this.pool.query<{ id: string; item_id: string; offer_url: string; runs_on: WatchRow["runsOn"] }>(
      "SELECT id, item_id, offer_url, runs_on FROM watches WHERE active ORDER BY started_at",
    );
    return rows.map((r) => ({ id: r.id, itemId: r.item_id, offerUrl: r.offer_url, runsOn: r.runs_on }));
  }

  async insertObservation(o: ObservationInput) {
    const id = newId("obs");
    await this.pool.query("INSERT INTO watch_observations (id, watch_id, price_cents, in_stock) VALUES ($1, $2, $3, $4)", [
      id,
      o.watchId,
      o.priceCents,
      o.inStock,
    ]);
    return id;
  }

  async insertEvent(e: EventInput) {
    const id = newId("evt");
    await this.pool.query(
      "INSERT INTO events (id, sponsor, label, status, duration_ms, provenance, detail) VALUES ($1, 'fly', $2, $3, $4, $5, $6)",
      [id, e.label, e.status, e.durationMs, e.provenance, JSON.stringify(e.detail)],
    );
    return id;
  }

  close() {
    return this.pool.end();
  }
}

/** No DATABASE_URL: same loop, nothing persisted. Every line is prefixed so it is never mistaken for real data. */
export class DryRunStore implements Store {
  readonly kind = "dry-run" as const;
  private watches: WatchRow[] = [];
  private log = (msg: string) => console.log(`[worker dry-run, not persisted] ${msg}`);

  async seedIfEmpty(runsOn: WatchRow["runsOn"]) {
    if (this.watches.length) return { inserted: 0, source: "existing watches" };
    this.watches = watchSeedsFromRun(sampleRun()).map((s) => ({ id: newId("watch"), ...s, runsOn }));
    for (const w of this.watches) this.log(`watch ${w.id} item=${w.itemId} url=${w.offerUrl}`);
    return { inserted: this.watches.length, source: "contract/fixtures/savings.sample.json (sample)" };
  }

  async markRunsOn(runsOn: WatchRow["runsOn"]) {
    this.watches = this.watches.map((w) => ({ ...w, runsOn }));
  }

  async activeWatches() {
    return this.watches;
  }

  async insertObservation(o: ObservationInput) {
    const id = newId("obs");
    this.log(`watch_observations ${JSON.stringify({ id, ...o, at: new Date().toISOString() })}`);
    return id;
  }

  async insertEvent(e: EventInput) {
    const id = newId("evt");
    this.log(`events ${JSON.stringify({ id, sponsor: "fly", ...e })}`);
    return id;
  }

  async close() {}
}
