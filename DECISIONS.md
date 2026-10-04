# Decision log

## 2026-10-04 ~10:00 — Idea selected: Personal Professional Buyer

Chose the Buyer over the higher-scoring Chief of Staff (matrix 96.4 vs 74.0).
Rationale: the matrix scores fit in a vacuum; judging is relative. The field will be
saturated with JARVIS/Chief-of-Staff entries, so differentiation is a multiplier.
The Buyer is the only landed-cost-comparison idea in the room and still touches
every judge's thesis (coalition play). Agent-ified (receipt mining + approval-gated
buying + price watches) it scores ~81 — tied 2nd.

## 2026-10-04 ~10:20 — It must be an agent, not a dashboard

As pitched, the Buyer risks reading as a price-comparison site. Required agent-ification:
receipt mining (no manual entry), approval-gated autonomous buying, long-running price
watches, memory of preferences. The demo must show the agent *acting* (spending money safely).

## 2026-10-04 ~10:20 — Corrections to pasted AI replies

- Jakub Krehel is the craft/design judge — bait with UI polish, not retry logic.
  (The reply confused Interfere's company tagline with his personal beat.)
- Browser automation must go through Kernel (Jue's product), not raw Puppeteer.
- Fly.io: $25M Series D + "Computers for Agents" pivot (not a "$25M initiative").
- Shamgunov (ex-Neon CEO, top prize is Neon credits) and da Costa (a16z, "is it a company?")
  are the panel heavyweights — not generic "practical" judges.
- Jeff Wang / Exa is central to the Buyer idea and was omitted from the reply.
- No unfalsifiable stats in the demo; scope cuts: smart fridge, auto-sent negotiation emails.

## 2026-10-04 ~10:30 — Repo live

github.com/stevenknowswhy/ProfessionalBuyer (public) is the project home.
Strategy docs committed as the initial commit; code lands here during the hack.
Local strategy copies also at /Users/stephenstokes/Workspace/ProfessionalBuyer/ (Mac).

## 2026-10-04 ~11:45 — Build plan and stack locked

Three goals: the app works, the UI is Awwwards-grade, and every sponsor has a clear use case in the
README and techStack.md. Full plan in PLAN.md; sponsor detail in techStack.md.

- **Language:** TypeScript for the product (Mastra and assistant-ui are TypeScript/React). Python only
  for the Laya sidecar. Resolves the "Node or Python" TODO in CONTRIBUTING.md.
- **Sponsors:** nine, per the event page: Neon, Mastra, Exa, Fly.io, Kernel, Executor, assistant-ui,
  AgentMail, CodeRabbit. Databricks is a judge's employer, not a co-host tool, so it is out of scope.
- **Cut depth before coverage.** Under time pressure an integration shrinks to its minimum viable form;
  it is not removed.
- **Neon is the shared bus.** The agent server and the Fly Sprite worker communicate only through
  Postgres, so either can fail without taking down the other.
- **Approvals are enforced server-side.** Mastra's `requireApproval` is the first gate. `purchase` also
  checks an approved row for the exact offer, a spend cap and a merchant allowlist. `CHECKOUT_MODE`
  stays `review` until two clean rehearsals.

## 2026-10-04 ~11:45 — The "$2,400/year" is a placeholder, not a target

STRATEGY.md and MVP.md show a $2,400/year headline. The three seed receipts cannot produce it:
the featured items have fewer than the 3 purchases the cadence math needs, and two fixtures contain
answer-key lines ("Compare: ..." and "4th diaper order this month"). The demo shows whatever the code
computes from the data, with a "how this was computed" drawer. Fixtures get expanded and cleaned
(see PLAN.md section 4).

## 2026-10-04 ~11:45 — CodeRabbit needs a human trigger

The repo has 0 stars, and CodeRabbit does not auto-review public repos under 10 stars. A person must
comment `@coderabbitai full review` on each PR (a bot-authored comment gets no response, confirmed on
PR #1). CONTRIBUTING.md now says so.

## 2026-10-04 ~12:00 — Solo, two parallel agents, one contract

Team is one person. To fit the time left, work is split between a frontend agent (`web/`) and a backend
agent (`agent/`, `worker/`, data, integrations), each with its own plan (PLAN-frontend.md,
PLAN-backend.md). They meet at `contract/` (Zod schemas, landed-cost math, sample fixtures) and
CONTRACT.md. The backend serves fixtures first so the frontend never waits. Approve and decline always
go through REST, so how the backend resumes the Mastra agent never affects the UI.

## 2026-10-04 ~12:00 — Checkout merchant is proposed by the integrations agent

"Guest checkout" means buying without an account, login or 2FA. Big retailers need those, which a
cloud browser handles badly. The integrations agent shortlists three guest-checkout merchants with a demo
item at or under the spend cap, and the human confirms. `CHECKOUT_MODE=review` is the default.

## 2026-10-04 ~12:00 — Cadence formula corrected

`buys_per_year = (n - 1) / span_days * 365`. n purchases span n-1 intervals; the earlier `n / days`
overstated the rate (most for items with few purchases). Implemented once in `contract/src/landed-cost.ts`.

## 2026-10-04 ~12:05 — Three builder agents plus a late release agent

Reviewed the two-agent split against the goals. The backend agent held the critical path (receipt to
yearly number) and the four slowest integrations (Kernel checkout, Sprite worker with a 1:45 PM deadline,
AgentMail, Laya) in sequence, while the frontend load was a single coherent job. Split the backend into
backend-core and integrations, joined by `contract/src/integrations.ts` and a frozen `db/schema.sql`.
Kept one frontend agent (design coherence matters more than speed for Best UI). Added a release agent
at 2:45 for testing, rehearsals and docs. Rejected more agents: one human reviewing and merging PRs is
the real bottleneck, and lockfile and ownership conflicts grow with each agent.

## 2026-10-04 ~12:20 — Research pass: approval via REST only, AI SDK v7, vendored skills

Checked templates, skills and vendor docs before starting the agents. Changes:
- **The model has no spending tool.** The earlier plan had the approve route resume a suspended Mastra
  `requireApproval` stream that no client would be listening to. Now `proposePurchase` writes a pending row and the
  REST approve route does the spending. Native `requireApproval` is a stretch after 3:15.
- **Chat is `POST /chat/buyer` with `chatRoute({ version: 'v7' })`.** assistant-ui requires AI SDK v7 and `chatRoute`
  defaults to v5; the plans disagreed on the path (`/chat` vs `/chat/buyer`).
- **Sprites:** service plus a renewed task keeps the worker awake; no WebSockets on the Sprite (TCP drops on pause).
- **Executor v1** (executor.sh), run beside the agent server. **Neon AI Gateway** needs a paid plan and a supported
  region: check now, direct key is the fallback.
- **Design:** cream plus serif is a known AI-generated look; the brief now asks for a specific palette and token plan.
- Vendored 16 official skills into `.claude/skills/` (pinned commits, licenses kept); AgentMail's unlicensed skill is
  installed at runtime instead. Added `AGENTS.md`, docs MCP servers in `.cursor/mcp.json`, and `.coderabbit.yaml`.
