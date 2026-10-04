# Build plan

Written Sun Oct 4, ~11:40 AM PT. Submissions close **4:30 PM PT** (about 4h50m left).
Top-6 demos start 4:45 PM: 2 min + 1 min Q&A.

This plan serves three goals. Every decision below is judged against them.

1. **The app works.** If the demo path breaks, we fail.
2. **The UI is beautiful.** It should look like an Awwwards submission, and it is our Best UI entry.
3. **Every sponsor is used, with a clear use case** in [README.md](README.md) and [techStack.md](techStack.md).

Companion docs: [PLAN-backend.md](PLAN-backend.md) and [PLAN-frontend.md](PLAN-frontend.md) (the two parallel agent plans), [CONTRACT.md](CONTRACT.md) (their shared interface), [techStack.md](techStack.md) (sponsor-by-sponsor), [MVP.md](MVP.md) (original slices),
[STRATEGY.md](STRATEGY.md) (judging), [DECISIONS.md](DECISIONS.md).

---

## 1. Where we are

| Area | State |
|---|---|
| Strategy, judges, scope docs | Done |
| Laya sidecar (`laya-sidecar/`) | Code on `main`, never run end to end |
| Seed receipts (`seed/receipts/`) | 3 fixtures on `main`, too thin and partly leaking answers (section 4) |
| App code (agent, web, worker, DB) | None |
| `.env.example` | In open [PR #1](https://github.com/stevenknowswhy/ProfessionalBuyer/pull/1), not merged. `.gitignore` added on this branch |
| CodeRabbit | Installed. Repo has 0 stars, so every review must be triggered by a human comment |

## 2. What each goal means in practice

### Goal 1: it works

- **The demo path is the product.** The path is: receipt in, purchase graph, live price scan, landed cost, yearly number, approve, Kernel checkout with live view. Build and harden that path before anything else.
- **Live by default, labeled fallbacks.** Every external call has a deterministic fallback. A fallback is always labeled in the UI ("replayed from the 3:41 PM rehearsal"). Never present cached data as live.
- **No hand-picked numbers.** Every figure on screen comes from code and has a "how this was computed" drawer ([section 4](#4-the-numbers-must-survive-how-did-you-compute-that)).
- **Preflight.** `pnpm preflight` checks every sponsor service and prints a green/red table. Run it at 3:30, 4:15 and 4:40.
- **Three clean rehearsals in a row** before we submit. A failed run resets the count.
- **A recorded 2-minute fallback video** exists before 4:15.

### Goal 2: beautiful

Design direction, motion rules and quality gates are in [section 8](#8-ui-direction-the-awwwards-bar).

### Goal 3: all sponsors, visibly

- Nine sponsors: **Neon, Mastra, Exa, Fly.io, Kernel, Executor, assistant-ui, AgentMail, CodeRabbit.**
- Rule: **cut depth before coverage.** If time runs short, an integration shrinks to its minimum viable form. It does not disappear.
- Every sponsor has a visible proof in the product or the repo ([section 7](#7-sponsor-coverage-gate)).
- The trace panel tags each step with its sponsor, so judges see the stack work without us narrating it.

---

## 3. Architecture

```
                         +--------------------------- web/ (Next.js) -----------------------------+
 you ──forward receipt──▶ |  assistant-ui chat  ·  savings dashboard  ·  trace panel  ·  live view |
   AgentMail inbox        +------------------------------┬----------------------------------------+
        │ WebSocket                                      │ HTTP + stream
        ▼                                                ▼
 +--------------- agent/ (Mastra server, :4111) ----------------------------------------------+
 |  ingest workflow:  Laya triage ▶ LLM parse (Zod) ▶ reconcile totals ▶ Neon                  |
 |  scan:             Exa per channel ▶ landed cost (pure code) ▶ rank ▶ savings run           |
 |  act:              verify (Kernel, read-only) ▶ approval gate ▶ checkout (Kernel)           |
 |  tools via:        Executor (one MCP endpoint, per-tool policy)                             |
 |  memory/traces:    Mastra on Neon Postgres · LLM calls via Neon AI Gateway                  |
 +------------┬--------------------------------------------------------------┬----------------+
              │ localhost:8787                                               │ Neon is the shared bus
              ▼                                                              ▼
      laya-sidecar/ (Python)                                  worker/ on a Fly Sprite
      yes/no + short-choice gates                             price watches · daily briefing
```

Principles:

- **One language for the product: TypeScript.** Mastra and assistant-ui are TypeScript/React. Python is used only for the Laya sidecar.
- **Neon is the shared bus.** `agent/` and `worker/` never call each other directly. Either side can be down without breaking the other.
- **`web/` has no database access.** It talks to `agent/` over HTTP and streams.
- **The same `worker/` code runs on a laptop or on a Sprite.** If the Sprite deploy fails, nothing changes except where it runs.

### Repo layout

```
contract/       Shared Zod schemas, landed-cost math, sample fixtures (the frontend/backend interface)
integrations/   @buyer/integrations: Kernel, AgentMail, Laya client (behind contract/src/integrations.ts)
agent/          Mastra server: agents, tools, workflows, API routes, units + landed-cost code
web/            Next.js app: landing, dashboard, chat, trace panel
worker/         Price watches + daily briefing (runs locally or on a Sprite)
laya-sidecar/   Local decision service (exists)
seed/           Fixture receipts + loader (exists, to be expanded)
db/schema.sql   Plain SQL schema applied to Neon (no ORM)
```

### Data model (Neon)

| Table | Purpose |
|---|---|
| `receipts` | Raw email, source, triage result, parse status, reconciliation result |
| `purchases` | Line items: canonical item, brand, quantity, unit, unit price, retailer, date |
| `items` | Canonical items, normalized unit, brand strictness (`exact` or `equivalent`) |
| `offers` | Per item and channel: price, shipping, duty estimate, delivered cost, unit cost, URL, fetched-at, verified-by-Kernel flag |
| `savings_runs` | One computed result: per-item savings, yearly total, inputs snapshot |
| `approvals` | Proposed purchase, offer hash, amount, merchant, status, decided-at |
| `watches`, `watch_observations` | Price watches and every poll result (the real history) |
| `events` | Every tool step: sponsor tag, label, duration, payload. Feeds the trace panel |
| `briefings` | Sent daily briefings |

Mastra also creates its own tables (memory, workflow snapshots) through `PostgresStore`.

---

## 4. The numbers must survive "how did you compute that?"

### Landed-cost spec

```
delivered_cost   = item_price + shipping + import_duty_estimate
unit_cost        = delivered_cost / normalized_units          (per sheet, per diaper, per egg, per oz)
saving_per_buy   = (current_unit_cost - best_unit_cost) * units_per_purchase
buys_per_year    = (observed_purchases - 1) / observed_days * 365   (n purchases span n-1 intervals)
yearly_savings   = sum(saving_per_buy * buys_per_year)        over items with enough history
```

Rules:

- **Sales tax is excluded from the comparison and stated on screen.** Pickup and shipped orders are both taxed. Only import duty is added.
- **An item needs at least 3 purchases over at least 14 days** to count toward the yearly total. Otherwise it shows "not enough history" and is excluded.
- **Offers must be in stock and normalizable to the same unit.** Excluded offers stay visible in the UI with the reason ("can't normalize: sold by weight"). Visible exclusions build trust.
- **The top pick is re-verified live by Kernel** (read-only page read) before it is proposed. The Exa snippet is a lead. The Kernel read is the price we show on the approval card.
- **Import duty is an estimate.** Do not hard-code rates from memory. Look up the current rate per product category, cite the URL next to each rate in code, and label the line "estimate". If rates are not verified by 3:00 PM, show long-haul as shipping-only with a visible "duties not included" flag.
- **The `$2,400/year` in [STRATEGY.md](STRATEGY.md) is a placeholder.** The demo shows whatever the code computes. Never type a number into the UI.

### Seed data fixes (do before building the pipeline)

The three fixtures in `seed/receipts/` cannot support the demo as written:

1. **Too thin for the yearly number.** Paper towels appear in 2 receipts, below the 3-purchase minimum. Expand to about 14 receipts over 6 to 8 weeks across 6 featured items: paper towels, toilet paper, diapers, eggs, batteries, dish soap. Label them "demo household" in the UI.
2. **Answer-key leaks.** `costco-bulk-01.txt` ends with a "Compare: Kirkland paper towels $21.99… vs Amazon Basics $24.99" line. `grocery-weekly-01.txt` ends with "this is your 4th diaper order this month". Remove both so the pipeline derives the comparison and the cadence itself.
3. **Unit trap.** Amazon sells "12 Double Rolls", Costco "12 rolls". Per roll is the wrong comparison. The pipeline must normalize to sheets. Keep this trap in the fixtures: it is exactly the question a judge asks.
4. **Real receipts beat fixtures.** Forward 2 or 3 real receipts from teammates' inboxes by 2:00 PM and use at least one live in the demo.

---

## 5. Risks and the first-hour spikes

The first 45 minutes run these as parallel pass/fail spikes (about 20 minutes each). Each has a fallback so a failure costs minutes, not the build.

| # | Spike | Pass when | Fallback if it fails |
|---|---|---|---|
| A | **Chat round-trip.** Mastra `chatRoute` (`version: 'v7'`) streams into assistant-ui and a `proposePurchase` tool result renders as the approval card | The card renders from a real tool result and its Approve calls `POST /api/approvals/:id/approve` | The dashboard's own buttons call the same scan and approval endpoints; chat shows text only. (Native `requireApproval` is a stretch, see techStack.md section 2) |
| B | **Kernel live view.** `browsers.create()`, `playwright.execute` reads a product page, `browser_live_view_url` embeds in our page | Live view renders in an iframe and the page title/price comes back | Open the live view URL in a second window beside the app |
| C | **Exa price extraction.** `outputSchema` with `maxAgeHours: 0` on 6 real products across 3 channels | At least 5 of 6 return a usable `{retailer, price, pack_quantity, unit, url}` | Exa `highlights` plus an LLM extraction step with the same Zod schema |
| D | **AgentMail inbound.** WebSocket receives a forwarded receipt with `extractedText`, including a PDF attachment | Forwarded receipt text reaches the agent within seconds | Poll `messages.list` every 5 seconds |
| E | **Neon + Gateway.** `PostgresStore` initializes, schema applies, one structured LLM call goes through the AI Gateway | Rows land in Neon and a Gateway completion returns | Direct provider key for the LLM only (Neon stays for data) |
| F | **Sprite stays awake.** A worker on a Sprite polls every minute for 30 minutes with no client attached | Observations keep arriving after 30 minutes | A scheduled ping to the Sprite URL wakes it for each poll cycle |
| G | **Executor connection.** Mastra `MCPClient` reaches an Executor endpoint and calls one source (AgentMail MCP or an OpenAPI source) | A tool call completes and the policy decision shows in our trace | Direct SDK calls for that tool, Executor shown on the policy screen only (see [techStack.md](techStack.md)) |

Other risks:

- **Sprites sleep when idle.** The Sprites docs list what resets the idle timer: an in-flight HTTP request, stdout output of an attached session, an open TCP connection, or an active task (renewable, max 1 hour). A bare polling loop would silently stop. Spike F decides the mechanism.
- **Real purchase on a real site.** Checkout can hit logins, CAPTCHAs or 2FA. Pick a **guest-checkout merchant** by 1:30 PM. Payment details live in a Kernel Vault and never touch our app or the model. `CHECKOUT_MODE=review` stops at the order-review page with live view visible. `CHECKOUT_MODE=place` is enabled for the final demo only if two rehearsals in a row succeed.
- **Laya download on venue Wi-Fi.** The weights are large (the skill file says about 2.3 GB for the English bundle). Download them **now**, on the fastest connection available, then run with `HF_HUB_OFFLINE=1`.
- **Venue Wi-Fi in general.** Self-host fonts and assets. No CDN calls on the demo path other than sponsor APIs.
- **Neon AI Gateway access.** The docs say the Gateway is available on paid plans during beta. Confirm the hackathon credits work on our org in Spike E.

---

## 6. Build order and schedule

All times PT. Gates are pass/fail; do not start the next gate's polish work while the current gate is red.

| Time | Gate | Done means |
|---|---|---|
| 11:40 to 12:25 | **G0: skeleton and spikes** | `.gitignore` added and PR #1 merged with env names aligned. Workspace scaffolded. Schema applied to Neon. Credits claimed. Spikes A to G have a pass or a chosen fallback |
| 12:25 to 1:30 | **G1: slice 1 on fixtures** | Seed receipts load, parse, reconcile, scan with Exa, compute landed cost and show a computed yearly number on a plain dashboard. AgentMail inbound feeds the same pipeline. Laya gates triage |
| 1:30 to 2:30 | **G2: the agent acts** | Chat works in assistant-ui with price cards and the approval card. Kernel verifies the top offer, checks out in `review` mode with live view. The Sprite worker is **deployed and writing real observations by 1:45 PM** so the demo has hours of true history |
| 2:30 to 3:15 | **G3: everything wired** | Executor connected, briefing email sends, trace panel shows sponsor chips, Mastra memory on Neon, `.coderabbit.yaml` in place |
| 3:15 to 4:00 | **G4: beautiful and rehearsed** | Design pass complete, "the Number" moment done, README + techStack.md + demo GIF, three clean rehearsals, preflight green. **Feature freeze at 4:00** |
| 4:00 to 4:25 | **Submit** | Submit on the portal by **4:15**. Only hotfixes after that. Recorded fallback video saved |
| 4:30 | Submissions close | |
| 4:45 | Top-6 demos | Run `pnpm preflight` at 4:40 |

Lunch is 1:00 to 1:45. Rotate rather than stop; G2 spans it.

### Cut order (when time runs short)

Cut from the top. Sponsor coverage is never cut, only depth.

1. Laya becomes LLM triage (same interface, one env var).
2. Lifecycle-cost and other stretch features.
3. Daily briefing becomes a single manual "send briefing" button (AgentMail still used).
4. Landing-page scroll story becomes a single hero.
5. Trace panel reads our own `events` table only (no Mastra trace API).
6. `CHECKOUT_MODE=place` stays `review`.

Never cut: the receipt-to-number path, the approval gate, Kernel live view, the Sprite worker, README + techStack.md.

### Work split

Three builder agents run in parallel from 12:00, plus a release agent from 2:45. The human is a solo owner: merges PRs at each gate, relays bug reports, and does the tasks only a person can do.

| Agent | Plan | Owns | Branch | Starts |
|---|---|---|---|---|
| Frontend (UI) | [PLAN-frontend.md](PLAN-frontend.md) | `web/` | `cursor/frontend-ui-5766` | 12:00 |
| Backend-core (API, data, pipeline, agent, Executor) | [PLAN-backend.md](PLAN-backend.md) | `agent/`, `db/`, `seed/`, preflight, CodeRabbit config | `cursor/backend-core-5766` | 12:00 |
| Integrations (Kernel, Sprite worker, AgentMail, Laya) | [PLAN-integrations.md](PLAN-integrations.md) | `integrations/`, `worker/`, `laya-sidecar/` | `cursor/integrations-5766` | 12:00 |
| Release (test, rehearse, docs, submission) | [PLAN-release.md](PLAN-release.md) | `README.md`, `techStack.md`, `docs/` | `cursor/release-5766` | 2:45 |

Nobody waits on anybody. [CONTRACT.md](CONTRACT.md) defines three seams: REST and chat (`contract/src/index.ts`), integration functions (`contract/src/integrations.ts`), and the database (`db/schema.sql`). Each side builds against stubs or sample fixtures first and swaps in the real thing with no change in shape.

Why this split: the original single backend agent held both the critical path (the yearly number) and the four slowest, flakiest integrations, including the 1:45 PM Sprite deadline, all in sequence. Moving Kernel, the Sprite worker, AgentMail and Laya to their own agent lets the Sprite go live on time and lets Kernel checkout get the trial and error it needs without stalling the pipeline. More agents than this would cost more in merge conflicts and review time than they save.

Human tasks, in order: merge PR #2 now; add sponsor keys as Cursor Cloud Agent secrets; start the three builders with their kickoff prompts; download the Laya weights on the demo laptop; forward real receipts by 2:00; create the Kernel Vault; merge at each gate and trigger `@coderabbitai full review` on each PR; start the release agent at 2:45; design review at 3:15; submit by 4:15.

---|---|---|---|
| Frontend (UI) | [PLAN-frontend.md](PLAN-frontend.md) | `web/` | `cursor/frontend-ui-5766` |
| Backend (agent, data, integrations) | [PLAN-backend.md](PLAN-backend.md) | `agent/`, `worker/`, `db/`, `seed/`, `laya-sidecar/`, preflight, CodeRabbit config | `cursor/backend-core-5766` |

They never wait on each other. [CONTRACT.md](CONTRACT.md) and `contract/` define every endpoint, tool result and sample payload. The backend serves the sample fixtures first, the frontend runs entirely on them, and the real backend replaces stubs endpoint by endpoint with no change in shape.

Human tasks (solo owner): merge PRs at each gate, trigger CodeRabbit reviews, claim sponsor credits and supply keys, forward real receipts, set up the Kernel Vault, pick the wordmark, run the 3:15 design review and the rehearsals, and submit.

---

## 7. Sponsor coverage gate

Check each row before the 4:00 freeze. Details and fallbacks are in [techStack.md](techStack.md).

| Sponsor | Visible proof in the product or repo |
|---|---|
| **Neon** | Purchase graph and price history in Postgres; Mastra memory on `PostgresStore`; LLM calls through the AI Gateway; trace chip "Neon" on each write |
| **Mastra** | Agent, tools, workflow, `requireApproval` on the buy tool, memory, tracing; trace chips |
| **Exa** | Live scan across local, shipped and long-haul channels; chips show queries and result counts |
| **Fly.io** | Worker on a Sprite with real watch history visible in the UI ("watching since 1:45 PM, 190 checks") |
| **Kernel** | Read-only live price verification and checkout with the live view embedded; replay saved |
| **Executor** | Tool calls routed through the gateway; policy decision (auto vs ask) visible in the trace |
| **assistant-ui** | The chat itself: streaming, edit and regenerate, price cards, approval card |
| **AgentMail** | The agent's own inbox receives receipts; sends the daily briefing and watch alerts |
| **CodeRabbit** | Public repo, `.coderabbit.yaml`, every PR reviewed (manual trigger), README OSS section with real review catches |

Not sponsors, but in the stack: Laya (open source, Apache-2.0), Next.js, Tailwind, shadcn/ui, Motion.

---

## 8. UI direction: the Awwwards bar

**Concept: a concierge's private ledger.** The product is a professional buyer for a household, so it should feel like a private bank or a very good concierge: calm, precise, warm. It should not feel like an AI dashboard. No purple gradients, no generic glass cards.

**Watch out: "warm cream plus serif" is itself a known AI-generated look.** Anthropic's `frontend-design` skill lists it as a tell, along with terracotta accents, all-caps tracked eyebrow labels, `A · B · C` meta strings and "→" on every button. Keep the ledger concept, but make it specific: pick a paper tone that is not the default cream (`#F4F1EA`-ish), an accent that is not terracotta, sentence-case labels, and one bold move (the Number) instead of decoration everywhere. Write the token plan first, as that skill asks, and get it approved in the F0 PR.

**Components that fit (verified Oct 4):** `@number-flow/react` for the Number's digit roll (MIT, no dependencies, respects reduced motion; size the parent, style via `::part()`); assistant-ui elements `approval-card` and `trace-waterfall` as starting points, fully restyled; hand-written SVG sparklines instead of a chart library. Avoid Magic UI shimmer/beam effects, Aceternity spotlights, and React Bits (Commons Clause license, heavy dependencies).

### Look

- **Color in OKLCH.** Warm paper background, deep ink text, one accent for savings (a restrained green), one signal color for "needs your approval". Two neutrals plus two accents total. One mode, done well.
- **Type.** A display serif for headlines and the big number, a clean sans for UI, a mono for formulas. Use tabular figures for every money value. Load fonts with `next/font` so they are self-hosted.
- **Layout.** Three zones: household ledger on the left (what you buy), the concierge conversation in the center, a workbench on the right (trace, live browser view, savings). On wide screens all three are visible so the demo never switches pages.
- **Landing (`/`).** One strong hero using the project's own line, "We were promised a utopia. This is part of it.", then a single scroll story that ends at "Open the buyer". Budget 30 minutes; it is the first cut candidate in the UI lane.

### The Number

The hero moment of the demo:

- Full-screen takeover with the computed yearly savings counting up over about 1.2 seconds with a digit roll.
- Below it, a one-line provenance ("14 receipts, 6 items, 3 channels") and a **"How this was computed"** drawer showing the formula and every input. This is what survives the Q&A.

### Chat (our Best UI entry)

- Streaming, stop, edit-and-regenerate with branches, suggestions, thread list (all built into assistant-ui).
- Tool results render as designed cards, not text: **price comparison card** with channels, delivered and unit costs; **approval card** with merchant, amount, cap, formula and Approve/Decline; **live browser card** with the Kernel view.
- The approval card is the signature interaction. Give it the most polish.

### Craft rules (from the design judge's own writing)

- Concentric radii: outer radius equals inner radius plus padding.
- Shadows as borders (`0 0 0 1px` ring plus soft shadow), not heavy outlines.
- Optical alignment of icons and text, 40px minimum hit areas, visible focus rings.
- Motion: 150 to 250ms, ease-out, 40ms stagger on enter, springs for layout moves. Nothing on the demo path blocks for more than 300ms. Respect `prefers-reduced-motion`.
- Skeletons instead of spinners. Designed empty states. `text-wrap: balance` on headings.
- Favicon, OG image, a real 404.

### Quality gates

- Lighthouse performance and accessibility at least 90 on `/` and the app.
- No layout shift during the scan; no jank in the count-up.
- **Design review at 3:15 PM** by someone who did not build it, from screenshots at 1440 and 1920 widths. Fix list is capped at 30 minutes.
- A 15-second UI GIF for the README before 4:00.

---

## 9. Demo script v2 (2:00)

Each beat shows a sponsor on screen.

| Time | What the audience sees | Sponsors visible |
|---|---|---|
| 0:00 | Hook: "Your household rebuys the same 50 things on autopilot and overpays on most." | |
| 0:15 | Forward a real receipt to the agent's inbox. Triage chip, then the purchase graph builds live | AgentMail, Neon, (Laya) |
| 0:40 | Scan runs: channels light up with sponsor chips. Landed-cost table with unit costs; one offer visibly excluded with its reason | Exa, Mastra, Executor |
| 1:10 | **The Number**, full-screen, computed. Pause | |
| 1:25 | "Buy the cheapest." Approval card. Tap Approve. Kernel live view checks out | assistant-ui, Mastra, Kernel |
| 1:55 | Close: "It doesn't just find the savings. With your permission, it acts on them." | |

Q&A ammunition:

- **Fly.io / infrastructure:** the worker has been watching prices on a Sprite since 1:45 PM; show the observation count.
- **Neon:** purchase history compounds; show the tables and the Gateway calls.
- **da Costa ("is it a company?"):** wedge is household procurement; users are every household with repeat purchases; revenue is a share of verified savings. Have this answer ready.
- **CodeRabbit / open source:** public repo, Apache-2.0, every PR reviewed, README documents the setup.

---

## 10. Decisions made and decisions still open

Defaults below are what the plan assumes. Change them only deliberately.

| Decision | Default | Revisit by |
|---|---|---|
| Language | TypeScript for the product, Python only for Laya | Locked |
| Orchestration | Standalone Mastra server on :4111, Next.js on :3000 | Locked after Spike A |
| Database access | Plain SQL + `pg` for app tables, `PostgresStore` for Mastra | Locked |
| Inbound email | AgentMail WebSocket (no public URL needed) | After Spike D |
| Spend controls | Per-purchase cap (`SPEND_CAP_USD`, default 25), merchant allowlist, offer-hash match, server-side approval check | Locked |
| Purchases | **None.** The app shows the offer and its link. No Kernel checkout and no Vault | Decided |
| Demo data | Sample fixtures in `contract/fixtures`, labeled Sample data. Live Exa is optional | Decided |
| Product name | Keep "Personal Professional Buyer" in the repo; pick a short brand name for the UI. Suggestion: **Margin** | 3:30 PM, so the wordmark can be built |
| Team size | **Solo**, with three parallel builder agents (frontend, backend-core, integrations) and a release agent from 2:45 | Decided |
| Agent interfaces | `contract/` package, `db/schema.sql` and [CONTRACT.md](CONTRACT.md); approve/decline always go through REST | Locked |
| Env var names | Align with Neon's CLI output (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) rather than `NEON_DATABASE_URL` in PR #1 | G0 |

## 11. Out of scope today

Smart-home or IoT inventory, auto-sent negotiation emails, subscription cancellation, Databricks integration (a judge's employer, not a co-host tool), Assistant Cloud (a prize, not a requirement; Mastra memory on Neon covers persistence), mobile apps, multi-household accounts, and any statistic we cannot defend live.

## 12. Skills, docs servers and starters (checked Oct 4)

- **Vendored agent skills** in `.claude/skills/` (see `SOURCES.md` there). Each agent plan names the ones to read before coding.
- **Docs MCP servers** in `.cursor/mcp.json`: Mastra, assistant-ui and shadcn (no keys needed).
- **Starters, not clones.** Backend: `npx create-mastra@latest`. Frontend: `npx assistant-ui@latest create`. There is no maintained template that combines Next.js, a separate Mastra server and assistant-ui, so we use the two official scaffolds plus the [separate-server guide](https://www.assistant-ui.com/docs/integrations/frameworks/mastra/separate-server).
- **Reference repos to read for patterns only** (old AI SDK versions, do not copy code): [mastra-ai/ui-dojo](https://github.com/mastra-ai/ui-dojo), [agentmail-to/agentmail-examples](https://github.com/agentmail-to/agentmail-examples), [kernel/kernel-nextjs-template](https://github.com/kernel/kernel-nextjs-template).
- Verified constraints that shape the build are in [techStack.md](techStack.md#verified-constraints-checked-oct-4-1215-pm).
