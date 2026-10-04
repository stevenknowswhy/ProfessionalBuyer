# Backend-core agent plan

Written Sun Oct 4, ~12:00 PM PT. Submissions close **4:30 PM PT**. Feature freeze 4:00 PM.
Read first: [PLAN.md](PLAN.md) (what and why), [CONTRACT.md](CONTRACT.md) (the interfaces you must honor), [techStack.md](techStack.md) (sponsor wiring and fallbacks).
Counterparts, running in parallel: [PLAN-frontend.md](PLAN-frontend.md) (UI) and [PLAN-integrations.md](PLAN-integrations.md) (Kernel, Sprite worker, AgentMail, Laya). You never wait for them.

## Mission

## Scope lock

The app does not buy anything. Do not call Kernel and do not implement checkout. `proposePurchase` is not a purchase: return the best offer and its URL. Serve `contract/fixtures` as the demo data and label them sample. Receipt triage, when you add it, calls Jev at `typesafe/jev-1.13` on `https://openrouter.ai/api/alpha/decisions` with `OPENROUTER_API_KEY`. Chat uses OpenAI `gpt-4o-mini`, falling back to OpenRouter `openrouter/free`. `agent/` already has a Mastra server stub. Finish it, do not rewrite it from scratch.

Make the REST and chat contract **real**: the Mastra server, Neon, the receipt-to-number pipeline (ingest, Exa scan, landed cost, the yearly number), the agent and its tools, Executor, and the approval gate. You are the hub: the frontend calls you, and you call the integrations package.

## Owns

`agent/`, `db/`, `seed/`, `.env.example`, `scripts/preflight.ts`, `.coderabbit.yaml`. Shares `contract/` ([change rules](CONTRACT.md#changing-the-contract)). Never edit `web/`, `integrations/`, `worker/` or `laya-sidecar/`.

Branch: `cursor/backend-core-5766`. Open small PRs into `main` at every gate. Do not let a branch sit unmerged for more than 45 minutes.

## Rules that decide everything

1. **Stub first.** The first deliverable (B0) serves every endpoint in `ENDPOINTS` from `contract/fixtures`. The frontend can switch to the real URL at any moment. Then replace stubs one endpoint at a time; the response shape never changes.
2. **Integrations behind an interface.** Code against `Integrations` in [`contract/src/integrations.ts`](contract/src/integrations.ts). Until `@buyer/integrations` lands, use a local stub that returns plausible values with `usingFallback: true`. When it lands, swap one import. Never call the Kernel, AgentMail, Sprites or Laya SDKs directly.
3. **Live by default, labeled fallback.** A fallback sets `provenance: "replayed"` or `usingFallback: true`. Never serve cached data as live.
4. **No hand-typed numbers.** Dollar figures come only from `@buyer/contract` landed-cost functions. Duty rates need a cited source URL in code or the line says "duties not included".
5. **Emit a `TraceEvent` for every external call** and persist it to `events`. Pass an `EmitTrace` callback to every integration call.
6. **Schema is frozen in [`db/schema.sql`](db/schema.sql)** (already written, applies cleanly). Add columns only additively and tell the other agents in the PR description. Plain SQL with `pg`, no ORM.

## Setup facts

- Node 22+, pnpm workspace. Add `agent/` (listed in `pnpm-workspace.yaml`).
- Env names: [`.env.example`](.env.example) and [KEYS.md](KEYS.md) (already aligned with Neon's `DATABASE_URL` names). Never commit secrets. If a key is missing, build against the fallback, mark it in `Health`, and list it in your PR description.
- Ports: Mastra server 4111. Custom REST routes use `registerApiRoute` from `@mastra/core/server`. Chat: `chatRoute({ path: '/chat/:agentId', version: 'v7' })` from `@mastra/ai-sdk`, agent key `buyer`, so the URL is `/chat/buyer`. **`version: 'v7'` is required** (assistant-ui needs AI SDK v7; the default is v5). CORS on the Mastra `server.cors` option for `http://localhost:3000`.
- Scaffold with `npx create-mastra@latest`, then install `@mastra/core @mastra/ai-sdk @mastra/pg @mastra/mcp ai` at `@latest` together.
- **Read these skills before coding** (in `.claude/skills/`): `mastra`, `neon-postgres`, `neon-ai-gateway`, `build-with-exa`. The Mastra docs MCP server is configured in `.cursor/mcp.json`.
- **LLM calls use OpenAI by default and OpenRouter as fallback.** The Neon AI Gateway needs a paid plan we do not have. Default: `OPENAI_API_KEY` with `gpt-4o-mini`. On a 429, a 5xx, or a missing key, retry the same request through OpenRouter (`baseURL: "https://openrouter.ai/api/v1"`, `apiKey: OPENROUTER_API_KEY`, `model: "openrouter/free"`), which picks a free model supporting tool calling and structured output. Record which provider served the call in the trace event and in `Health`. Do not integrate the Gateway.

## Timeline (PT)

### B0. 12:00 to 12:40: skeleton the frontend can call

- `agent/` Mastra project; server on :4111; CORS for :3000.
- All `ENDPOINTS` served from fixtures, including `GET /api/trace` as SSE replaying `trace.sample.json` 400 ms apart. `POST /chat/buyer` is a canned agent that calls `showSavings` with the sample run.
- `.env.example` and `.coderabbit.yaml` are already in the repo (see [KEYS.md](KEYS.md)); add names only if you need new ones. `pnpm dev` starts the server.
- **Done when:** `curl localhost:4111/api/savings/latest` passes `SavingsRun.parse`. Merge immediately.

### B1. 12:40 to 1:30: the number, real

- Apply `db/schema.sql` to Neon; `pg` pool; Mastra `PostgresStore`. One structured LLM call through the Neon AI Gateway (fallback: direct provider key). (Spike E.)
- Seed: expand `seed/receipts/` to the 14 receipts in `contract/scripts/generate-fixtures.ts` (same dates, retailers, items and units). Remove the two answer-key lines from the existing three ([PLAN.md section 4](PLAN.md#seed-data-fixes-do-before-building-the-pipeline)). Keep the sheets-versus-rolls trap.
- Ingest function `ingestReceipt(text, source)`: `integrations.triage.isReceipt` then LLM parse into Zod then reconcile line totals to the receipt total then write to Neon. The integrations agent wires AgentMail inbound to call this same function.
- Scan: Exa search per item and channel with `outputSchema` and `maxAgeHours: 0`; fallback to highlights plus LLM extraction with the same schema. Normalize units. Compute with `@buyer/contract`. Persist offers and the `SavingsRun`. (Spike C.)
- Replace stubs: `household`, `seed`, `scan`, `savings/*`, `trace`, `trace/history`.
- **Done when:** `POST /api/seed` then `POST /api/scan` produce a `SavingsRun` computed from live Exa results.

### B2. 1:30 to 2:30: the agent acts

- Mastra agent with tools named exactly as `ToolResults` keys (`showSavings`, `showOffers`, `proposePurchase`, `showLiveView`), each returning its contract schema. Memory on Neon, tracing on.
- Executor (v1, [executor.sh](https://executor.sh); follow https://executor.sh/setup-prompt.md): run `npm i -g executor && executor install && executor web` next to the agent server (port 4788), add the AgentMail MCP and Exa MCP as sources, and connect Mastra `MCPClient` to `http://127.0.0.1:4788/mcp` for the outside tools listed in [techStack.md section 6](techStack.md#6-executor-one-gateway-for-the-agents-outside-tools). Write each policy decision into the trace event's `policy`. At least one tool is `ask`. (Spike G.)
- Approval gate: the model has **no tool that spends money**. `proposePurchase` calls `integrations.kernel.verifyOffer`, uses the verified price, and writes a `pending` `Approval` row, which it returns as the tool result. `POST /api/approvals/:id/approve` checks cap, merchant allowlist and offer hash against a fresh read, then calls `integrations.kernel.checkout` with `mode` from `CHECKOUT_MODE` and stores `liveViewUrl` the moment `onLiveView` fires. Run checkout in the background and return the `executing` approval immediately; the UI polls. (Spike A: the tool result renders as the card in assistant-ui.)
- Do **not** build Mastra-native `requireApproval` before 3:15. It is a stretch ([why](techStack.md#2-mastra-the-agent-and-its-guardrails)).
- Merchant allowlist and demo item come from the integrations agent's pick (recorded in `DECISIONS.md`).
- **Done when:** in chat, "buy the cheapest" yields `proposePurchase`; approve drives `checkout` (stubbed or real) and the approval reaches `completed` with a live view URL.

### B3. 2:30 to 3:15: everything wired

- Swap the integrations stub for `@buyer/integrations`.
- `POST /api/briefing/send`: compose the briefing (savings, watch changes from `watch_observations`) and send via `integrations.mail.send`.
- `GET /api/watches` and observations read the tables the Sprite worker writes.
- `GET /api/health` merges your own checks (Neon, Gateway, Mastra, Exa, Executor) with `integrations.health()`. `pnpm preflight` prints it as a table and exits nonzero on red.
- **Done when:** preflight is green or labeled, and the full path runs with the frontend on real data.

### B4. 3:15 to 4:00: harden

- With the release agent, run the full path three times in a row in `review` mode. Fix what breaks.
- Write a recorded scan so the demo can fall back to a "replayed" labeled run.
- Put the backend "how it works" text in your PR description for the README.
- **Feature freeze at 4:00.**

## Acceptance checklist

- [ ] Every endpoint responds and passes its contract schema (`pnpm contract:smoke` hits each one).
- [ ] The yearly number comes from live Exa results and the shared landed-cost code.
- [ ] Approve returns `blocked` with a plain reason for over-cap, non-allowlisted merchant and changed price (hash mismatch). Covered by tests.
- [ ] Trace events from core cover Neon, Mastra, Exa and Executor, with Executor policy shown.
- [ ] `GET /api/health` is honest; no fallback is unlabeled. No secrets in the repo.

## Kickoff prompt

```
You are the BACKEND-CORE agent for "Personal Professional Buyer", a hackathon app due 4:30 PM PT today (feature freeze 4:00 PM). I am the only human. Two other agents work in parallel: FRONTEND (web/) and INTEGRATIONS (integrations/, worker/, laya-sidecar/: Kernel, Sprite worker, AgentMail, Laya).

Read in order: PLAN-backend.md (your plan), CONTRACT.md, contract/src/index.ts, contract/src/integrations.ts, db/schema.sql, PLAN.md, techStack.md.

Work on branch cursor/backend-core-5766 from main. Edit only agent/, db/, seed/, .env.example, scripts/, .coderabbit.yaml, plus additive contract changes per CONTRACT.md.

Before coding, read the skills listed in PLAN-backend.md (mastra, neon-postgres, neon-ai-gateway, build-with-exa) and AGENTS.md. Start with B0: serve every endpoint in ENDPOINTS from contract/fixtures on the Mastra server at :4111 and open a PR immediately. Then follow the timeline. Call Kernel, AgentMail and Laya only through the Integrations interface, stubbed until @buyer/integrations lands. Use the shared landed-cost functions for every dollar figure. If a key is missing, use the labeled fallback and tell me in the PR description; do not stop.
```
