-- App tables on Neon. Plain SQL, applied with `psql "$DATABASE_URL_UNPOOLED" -f db/schema.sql`.
-- Idempotent. Mastra creates its own tables separately via PostgresStore.
-- Columns mirror contract/src/index.ts. Money is integer cents; normalized units are numeric.
-- Changing a column is a contract change (see CONTRACT.md).

CREATE TABLE IF NOT EXISTS receipts (
  id               text PRIMARY KEY,
  source           text NOT NULL CHECK (source IN ('agentmail', 'seed')),
  retailer         text NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  raw_text         text NOT NULL,
  is_receipt       boolean NOT NULL,
  triage_via       text NOT NULL CHECK (triage_via IN ('laya', 'llm', 'jev')),
  triage_confidence real NOT NULL,
  reconciled       boolean NOT NULL DEFAULT false,
  total_cents      integer NOT NULL DEFAULT 0
);
-- CREATE TABLE IF NOT EXISTS does not update an existing check. Widen it so a Jev result can be stored.
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_triage_via_check;
ALTER TABLE receipts ADD CONSTRAINT receipts_triage_via_check CHECK (triage_via IN ('laya', 'llm', 'jev'));

CREATE TABLE IF NOT EXISTS items (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  brand             text,
  brand_strictness  text NOT NULL CHECK (brand_strictness IN ('exact', 'equivalent')),
  unit              text NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id                text PRIMARY KEY,
  item_id           text NOT NULL REFERENCES items(id),
  receipt_id        text NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  retailer          text NOT NULL,
  date              timestamptz NOT NULL,
  quantity          numeric NOT NULL,
  normalized_units  numeric NOT NULL CHECK (normalized_units > 0),
  line_total_cents  integer NOT NULL
);
CREATE INDEX IF NOT EXISTS purchases_item_date ON purchases (item_id, date);

CREATE TABLE IF NOT EXISTS savings_runs (
  id                    text PRIMARY KEY,
  started_at            timestamptz NOT NULL DEFAULT now(),
  finished_at           timestamptz,
  status                text NOT NULL CHECK (status IN ('running', 'done', 'error')),
  yearly_savings_cents  integer NOT NULL DEFAULT 0,
  provenance            text NOT NULL CHECK (provenance IN ('live', 'replayed', 'sample')),
  -- Full SavingsRun JSON (items, inputs) so the API returns exactly what was computed.
  body                  jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id                   text PRIMARY KEY,
  run_id               text NOT NULL REFERENCES savings_runs(id) ON DELETE CASCADE,
  item_id              text NOT NULL REFERENCES items(id),
  channel              text NOT NULL CHECK (channel IN ('local', 'shipped', 'long-haul')),
  retailer             text NOT NULL,
  url                  text NOT NULL,
  title                text NOT NULL,
  price_cents          integer NOT NULL,
  shipping_cents       integer NOT NULL,
  duty_estimate_cents  integer NOT NULL,
  delivered_cents      integer NOT NULL,
  normalized_units     numeric NOT NULL,
  unit_cost_cents      double precision NOT NULL,
  in_stock             boolean NOT NULL,
  fetched_at           timestamptz NOT NULL,
  verified_by_kernel   boolean NOT NULL DEFAULT false,
  excluded_reason      text,
  provenance           text NOT NULL CHECK (provenance IN ('live', 'replayed', 'sample'))
);
CREATE INDEX IF NOT EXISTS offers_run_item ON offers (run_id, item_id);

CREATE TABLE IF NOT EXISTS approvals (
  id               text PRIMARY KEY,
  item_id          text NOT NULL REFERENCES items(id),
  offer_id         text NOT NULL REFERENCES offers(id),
  offer_hash       text NOT NULL,
  merchant         text NOT NULL,
  amount_cents     integer NOT NULL,
  cap_cents        integer NOT NULL,
  status           text NOT NULL CHECK (status IN ('pending', 'approved', 'declined', 'executing', 'completed', 'failed', 'blocked')),
  blocked_reason   text,
  mode             text NOT NULL CHECK (mode IN ('review', 'place')),
  mastra_run_id    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz,
  -- Approval.checkout JSON: kernelSessionId, liveViewUrl, replayUrl, stoppedAt, orderRef.
  checkout         jsonb
);

CREATE TABLE IF NOT EXISTS watches (
  id               text PRIMARY KEY,
  item_id          text NOT NULL REFERENCES items(id),
  offer_url        text NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  runs_on          text NOT NULL CHECK (runs_on IN ('sprite', 'local')),
  active           boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS watch_observations (
  id           text PRIMARY KEY,
  watch_id     text NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  at           timestamptz NOT NULL DEFAULT now(),
  price_cents  integer,
  in_stock     boolean NOT NULL
);
CREATE INDEX IF NOT EXISTS watch_observations_watch_at ON watch_observations (watch_id, at);

-- Every external call. Feeds GET /api/trace. Any process (agent server, Sprite worker) may insert.
CREATE TABLE IF NOT EXISTS events (
  id           text PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  sponsor      text NOT NULL,
  label        text NOT NULL,
  status       text NOT NULL CHECK (status IN ('running', 'ok', 'error', 'skipped')),
  duration_ms  integer,
  policy       text CHECK (policy IN ('allow', 'ask', 'block')),
  provenance   text NOT NULL DEFAULT 'live' CHECK (provenance IN ('live', 'replayed', 'sample')),
  detail       jsonb
);
CREATE INDEX IF NOT EXISTS events_at ON events (at);

CREATE TABLE IF NOT EXISTS briefings (
  id          text PRIMARY KEY,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  to_address  text NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL
);
