# Backend agent plan

Written Sun Oct 4, ~12:00 PM PT. Submissions close **4:30 PM PT**. Feature freeze 4:00 PM.
Read first: [PLAN.md](PLAN.md) (what and why), [CONTRACT.md](CONTRACT.md) (the interface you must honor), [techStack.md](techStack.md) (sponsor wiring and fallbacks).
Counterpart: [PLAN-frontend.md](PLAN-frontend.md). You never wait for it, and it never waits for you.

## Mission

Build the whole backend so that the contract in [CONTRACT.md](CONTRACT.md) is **real**: receipt in, purchase graph, live price scan, landed cost, the yearly number, approval, Kernel checkout, Sprite price watches, AgentMail briefing. Every sponsor on the backend side is used for something visible.

## Owns

`agent/`, `worker/`, `db/`, `seed/`, `laya-sidecar/`, `.env.example`, `scripts/preflight.ts`, `.coderabbit.yaml`. Shares `contract/` ([change rules](CONTRACT.md#changing-the-contract)). Never edit `web/`.

Branch: `cursor/backend-core-5766`. Open small PRs into `main` at every gate. Do not let a branch sit unmerged for more than 45 minutes.

## Rules that decide everything

1. **Stub first.** The first deliverable (B0) serves every endpoint in `ENDPOINTS` from `contract/fixtures`. The frontend can then switch to the real URL at any moment. From then on you replace stubs one endpoint at a time and the response shape never changes.
2. **Live by default, labeled fallback.** Every external call has a deterministic fallback. A fallback sets `provenance: "replayed"` or `Health.services[].usingFallback: true`. Never serve cached data as live.
3. **No hand-typed numbers.** All dollar figures come from `@buyer/contract` landed-cost functions. Duty rates need a cited source URL in code or are shown as "duties not included".
4. **Emit a `TraceEvent` for every external call** (sponsor tag, label, duration, `policy` for Executor calls). The frontend's trace panel is built on this stream. It is the cheapest way to make every sponsor visible.
5. **Cut depth, never coverage.** Order of cuts is in [PLAN.md](PLAN.md#cut-order-when-time-runs-short).
6. **Plain SQL with `pg`.** No ORM. Schema in `db/schema.sql`. Mastra creates its own tables via `PostgresStore`.

## Setup facts

- Node 22+, pnpm. Workspace already has `contract/`; add `agent/` and `worker/` (both listed in `pnpm-workspace.yaml`).
- Env names are in [techStack.md](techStack.md#environment-variables). Create `.env.example` with names only and never commit secrets. Neon names: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`. If a key is missing from the environment, do not stall: build against the fallback, mark it in `Health`, and list the missing key in your PR description for the human.
- Ports: Mastra server 4111, Laya sidecar 8787.
- Custom REST routes use `registerApiRoute` from `@mastra/core/server` (Hono handlers). Chat uses `chatRoute` from `@mastra/ai-sdk` at `/chat`.

## Timeline

Times are PT. Each block ends with a demonstrable result and a PR.

### B0. 12:00 to 12:40: skeleton that the frontend can call

- `agent/` Mastra project; server on :4111; CORS for :3000.
- All `ENDPOINTS` served from fixtures, including `GET /api/trace` as SSE that replays `trace.sample.json` with 400 ms spacing. `POST /chat` can be a canned agent that calls `showSavings` with the sample run.
- `.env.example`, `.coderabbit.yaml` (path instructions in [techStack.md](techStack.md)), `pnpm dev` starts everything.
- **Done when:** `curl localhost:4111/api/savings/latest` returns a body that passes `SavingsRun.parse`. Merge this PR immediately.

### B1. 12:40 to 1:30: the data path, real

- `db/schema.sql` applied to Neon (tables in [PLAN.md](PLAN.md#data-model-neon)); `pg` pool; Mastra `PostgresStore` initialized. (Spike E.)
- Seed fixtures: expand `seed/receipts/` to the 14 receipts in `contract/scripts/generate-fixtures.ts` (same dates, retailers, items, units). Remove answer-key leaks from the existing three ([PLAN.md section 4](PLAN.md#seed-data-fixes-do-before-building-the-pipeline)). Keep the sheets-versus-rolls unit trap.
- Ingest workflow: Laya triage (sidecar on :8787; if it is not ready, the LLM triage fallback behind the same function) then LLM parse into Zod via the Neon AI Gateway (fallback: direct provider key) then reconcile line totals to the receipt total then write to Neon. Emit trace events with sponsor tags `laya`, `mastra`, `neon`.
- AgentMail inbound: WebSocket listener feeds the same ingest function. Fallback: poll `messages.list` every 5 seconds. (Spike D.)
- Landed-cost scan: Exa search per item and channel with `outputSchema` and `maxAgeHours: 0`; fallback to highlights plus LLM extraction with the same Zod schema. Normalize units (sheets, not rolls). Compute with `@buyer/contract`. Write `SavingsRun`. (Spike C.)
- Replace stubs: `household`, `seed`, `scan`, `savings/*`, `trace`, `trace/history` now read and write real data.
- **Done when:** `POST /api/seed` then `POST /api/scan` produce a `SavingsRun` whose `yearlySavingsCents` is computed from live Exa results, and a forwarded email reaches `household`.

### B2. 1:30 to 2:30: the agent acts

- Mastra agent with tools named exactly as `ToolResults` keys: `showSavings`, `showOffers`, `proposePurchase`, `showLiveView`, each returning its contract schema. Tools are reached through the Executor MCP gateway where Spike G passes; the policy decision is written into the trace event's `policy`. Memory on Neon, tracing on.
- Kernel verify: read-only page read of the top offer; set `verifiedByKernel` and the verified price. The verified price replaces the Exa snippet price on the approval.
- **Pick the demo purchase.** The cap makes this a real constraint: the default `SPEND_CAP_USD` is 25 and a diaper carton is not under it. Pick one item with a delivered cost at most the cap from a **guest-checkout merchant** (no account, login, 2FA or CAPTCHA). Shortlist three candidate merchants with the product URL, confirm guest checkout works by loading the page in Kernel, then record the chosen merchant and URL in `DECISIONS.md` via your PR description. Put the merchant on the allowlist.
- Approval gate: `proposePurchase` writes the `Approval` row. `POST /api/approvals/:id/approve` checks cap, allowlist and offer hash, then runs Kernel checkout (`CHECKOUT_MODE=review` stops at the order-review page). Payment details come from a Kernel Vault and never touch the app or the model. Fill `checkout.liveViewUrl` as soon as the browser exists. Save the replay. (Spike B.) The purchase tool is marked `requireApproval` and the approve route resumes it with `approveToolCall`; if that spike fails, the route calls the checkout function directly. The contract does not change either way.
- **Sprite worker deployed by 1:45 PM.** `worker/` polls the best offer of each featured item on a schedule and writes `watch_observations` to Neon. Deploy it with the Sprites SDK, keep it awake by the mechanism Spike F proves (fallback: a scheduled ping to the Sprite URL). `GET /api/watches` shows `runsOn: "sprite"`. It must run for hours before the 4:45 demo so the observation count is real.
- **Done when:** from `POST /chat` "buy the cheapest" yields a `proposePurchase` result, approve in `review` mode drives a Kernel browser with a live view URL, and the Sprite has written at least 10 observations.

### B3. 2:30 to 3:15: everything wired

- Briefing: AgentMail sends the daily briefing and a watch alert (`POST /api/briefing/send`), summarizing savings and watch changes.
- `GET /api/health` reports every sponsor truthfully with notes. `pnpm preflight` prints the same as a green and red table and exits nonzero on any red.
- Executor policy visible: at least one tool is `ask` or `block` and shows in the trace.
- Laya: the sidecar gates triage and the buy guard; one env var switches to the LLM fallback.
- `.coderabbit.yaml` in place (it should already be). Watch for review comments on your PRs and resolve real findings; the human triggers reviews with `@coderabbitai full review`.
- **Done when:** `pnpm preflight` is all green or shows labeled fallbacks, and the full path runs end to end with the frontend on real data.

### B4. 3:15 to 4:00: harden and rehearse

- Run the full path 3 times in a row with `CHECKOUT_MODE=review`. Fix whatever breaks. A failed run resets the count.
- If two consecutive review runs are clean and the human agrees, one run with `CHECKOUT_MODE=place` on a purchase at or under the cap, never above.
- Record fallbacks: save a recorded scan and a Kernel replay so the demo can fall back to "replayed" labeled data.
- Write the "how it works" backend section for the README in your PR description (the human merges it into README and techStack.md). Include real CodeRabbit catches you saw.
- **Feature freeze at 4:00.** After that, fixes only.

## Acceptance checklist (all must be true by 4:00)

- [ ] Every endpoint in `ENDPOINTS` responds and its body passes the contract schema (add a script `pnpm contract:smoke` that hits each endpoint and parses the response).
- [ ] The yearly number comes from live Exa results and the shared landed-cost code; unit tests pass (`pnpm contract:check`).
- [ ] An email forwarded to the agent inbox shows up in `household` within 30 seconds.
- [ ] Approval blocks: over-cap, non-allowlisted merchant and changed-price (hash mismatch) attempts each return `blocked` with a plain reason. Cover with a test.
- [ ] Kernel verify sets `verifiedByKernel: true` on the approved offer; checkout returns a working `liveViewUrl` and a saved replay.
- [ ] The Sprite worker has been writing observations since before 2:00 PM and survives with no client attached.
- [ ] Trace events exist for all nine sponsors plus Laya, each with the right tag.
- [ ] `GET /api/health` is honest, and no fallback is unlabeled.
- [ ] No secrets in the repo. `.env.example` lists every name.

## What to ask the human for (solo owner)

Put these in your first PR description so the human can do them in parallel while you code:

- Claim credits and provide keys for Neon, Exa, Kernel, Fly, AgentMail, Executor, and an LLM key if the Gateway fails.
- Forward 2 or 3 real receipts to the agent inbox by 2:00 PM.
- Create a Kernel Vault and add a payment method with a low limit for the final `place` run.
- Download the Laya weights now with `HF_HUB_OFFLINE=1` set afterwards.
- Trigger `@coderabbitai full review` on your PRs from their own account.

## Kickoff prompt (paste into the backend cloud agent)

```
You are the BACKEND agent for "Personal Professional Buyer", a hackathon app due 4:30 PM PT today (feature freeze 4:00 PM). I am the only human on the team.

Read, in this order: PLAN-backend.md (your plan), CONTRACT.md (the interface), PLAN.md (product and landed-cost rules), techStack.md (sponsor wiring and fallbacks), contract/src/index.ts.

Work on branch cursor/backend-core-5766, branched from main. Do not edit web/. Another agent builds the UI in parallel and depends on the contract.

Start with B0: serve every endpoint in ENDPOINTS from contract/fixtures on the Mastra server at :4111 and open a PR immediately. Then replace stubs with real implementations following the timeline in PLAN-backend.md. Use the shared landed-cost functions for every dollar figure. Add a labeled fallback for every external call. Open small PRs at every gate. If a key is missing, build against the fallback and tell me what you need in the PR description; do not stop.
```
