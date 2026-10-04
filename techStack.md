# Tech stack and sponsor use cases

Every co-host tool at the Build Personal Agents Hack has a real job in the Personal Professional Buyer,
plus CodeRabbit for the open-source track. This file says what each one does, where it shows up in the demo,
how it is wired, and what we do if it breaks.

Status values: **Planned** (not built), **Spiking** (being proven), **Live** (works end to end).
Update the status column in [README.md](README.md) when a row changes.

Build order and schedule: [PLAN.md](PLAN.md).

## At a glance

| # | Sponsor | Job in the Buyer | Where judges see it | Status |
|---|---|---|---|---|
| 1 | **Neon** | Postgres for the purchase graph and price history; Mastra memory store; AI Gateway for every LLM call | Trace chips on each write; "memory compounds" Q&A | Planned |
| 2 | **Mastra** | The agent: tools, ingest workflow, memory, tracing, approval gate on the buy tool | Approval card; trace panel | Planned |
| 3 | **Exa** | Live price discovery across local, shipped and long-haul channels | The scan: channels light up with queries and counts | Planned |
| 4 | **Fly.io (Sprites)** | An always-on computer for price watches and the daily briefing | "Watching since 1:45 PM, N checks" | Planned |
| 5 | **Kernel** | Re-verifies the winning price on the real page, then checks out with live view | Live browser card during approval and checkout | Planned |
| 6 | **Executor** | One MCP gateway for the agent's outside tools, with per-tool allow / ask / block policy | Policy decision in the trace | Planned |
| 7 | **assistant-ui** | The whole chat surface: streaming, edit and regenerate, price cards, approval card | The UI itself (Best UI entry) | Planned |
| 8 | **AgentMail** | The agent's own inbox: receives receipts, sends the daily briefing and alerts | Forward a receipt; briefing email | Planned |
| 9 | **CodeRabbit** | Reviews every PR; public repo and README for Best Open Source | Repo, `.coderabbit.yaml`, review history | Planned |

Not sponsors, but in the stack: **Laya** (open-source local decision model), **Next.js**, **Tailwind**, **shadcn/ui**,
**Motion**, **Zod**, **pg**.

## How a request flows

```
receipt email ─▶ AgentMail ─▶ Laya triage ─▶ LLM parse (Neon AI Gateway) ─▶ reconcile totals ─▶ Neon
                                                                                             │
  scan: Exa (per channel) ─▶ landed cost (code) ─▶ rank ─▶ savings run ─▶ Neon ─▶ "the Number"
                                                                                             │
  act:  Kernel verify ─▶ approval card (assistant-ui) ─▶ Mastra gate ─▶ Kernel checkout
                                                                                             │
  watch: Sprite worker polls Exa ─▶ Neon observations ─▶ AgentMail alert / daily briefing
```

All outside tools the agent calls pass through Executor where a source exists there; see section 6.

---

## 1. Neon: memory and the model gateway

**Use case.** Two roles.

- **Postgres** holds the household purchase graph, every offer we saw, every price-watch observation, approvals and the
  event log. It is the shared bus between the agent server and the Sprite worker, so either can be down without
  breaking the other. Mastra uses the same database for memory and workflow snapshots through `PostgresStore`.
- **AI Gateway** is the single place every LLM call goes: receipt parsing with structured output, chat, briefing copy.
  It is OpenAI-compatible, so one base URL and one token cover all models.

**Demo moment.** Each write shows a "Neon" chip in the trace. In Q&A: "purchase history compounds in Postgres; the
agent gets better every month."

**Wiring (from Neon and Mastra docs).**

```bash
neon link && neon env pull        # writes DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED
```

```ts
import { Mastra } from '@mastra/core/mastra'
import { PostgresStore } from '@mastra/pg'

export const mastra = new Mastra({
  storage: new PostgresStore({ id: 'neon-storage', connectionString: process.env.DATABASE_URL! }),
})
```

- Use the pooled `DATABASE_URL` at runtime and `DATABASE_URL_UNPOOLED` to apply `db/schema.sql`.
- AI Gateway chat completions: base URL is `${NEON_AI_GATEWAY_BASE_URL}/v1`, bearer token is `NEON_AI_GATEWAY_TOKEN`.
  Model ids are short names such as `gpt-5-mini` or `gemini-3-flash`. Neon's model catalog page has a copy-paste
  Mastra snippet for each model; use it (Spike E).
- Model choice is two env vars (`LLM_MODEL_FAST`, `LLM_MODEL_CHAT`) so we can swap without code changes.

**Fallback.** Gateway unavailable: use a direct provider key for the LLM only. Neon stays the database.

**Proof.** `db/schema.sql` in the repo; trace chips; README section "How Neon is used".

**Check at kickoff.** The docs say AI Gateway is on paid plans during beta; confirm the hackathon credits work on our
organization (Spike E).

---

## 2. Mastra: the agent and its guardrails

**Use case.** The agent is a Mastra `Agent` with typed tools (`createTool` with Zod schemas), an ingest workflow, memory
and tracing, served to the UI by `chatRoute`. Its most important property for us is a **hard separation between
proposing and spending**: the model has no tool that spends money. It can only call `proposePurchase`, which writes a
pending approval. Money moves only when a human taps Approve, in a server route the model cannot call.

Tools the model sees (names fixed by the contract): `showSavings`, `showOffers`, `proposePurchase`, `showLiveView`, plus
internal tools for scanning and verifying, and the outside tools surfaced by Executor.

Memory: message history plus **Observational Memory** and working memory for household preferences (brand strictness,
"diapers weekly, small savings are worth acting on; a toaster is not").

**Demo moment.** The approval card, the trace panel, and the line "the model proposes; a human and a server-side
check decide."

**Wiring (from Mastra docs).**

```ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const proposePurchase = createTool({
  id: 'proposePurchase',
  description: 'Propose buying the best verified offer. Creates a pending approval; it does not buy.',
  inputSchema: z.object({ itemId: z.string(), offerId: z.string() }),
  outputSchema: Approval,                       // from @buyer/contract
  execute: async ({ itemId, offerId }) => createPendingApproval(itemId, offerId),
})
```

- Chat endpoint: `chatRoute({ path: '/chat/:agentId', version: 'v7' })` from `@mastra/ai-sdk`, served at
  `http://localhost:4111/chat/buyer`. **`version: 'v7'` is required**: current assistant-ui needs AI SDK v7, and
  `chatRoute` defaults to v5. `:agentId` is the key in the `agents` object, not the agent's `name`.
- **Stretch only (after 3:15, if everything else is green):** Mastra's native `requireApproval` on a tool, rendered by
  assistant-ui's approval card with `respondToApproval` and `sendAutomaticallyWhen:
  lastAssistantMessageIsCompleteWithApprovalResponses`. It needs storage (Neon) for snapshots. It is not on the critical
  path because the v7 approval round-trip is not covered by Mastra's own end-to-end tests yet, and the REST path already
  gives the same guarantee.
- Tracing is enabled for the Studio view. The in-product trace panel reads our own `events` table, which every tool
  wrapper writes with a sponsor tag.

**Defense in depth.** Layer one: the model has no spending tool. Layer two: `POST /api/approvals/:id/approve` re-checks
server-side that the offer hash still matches a fresh read, the amount is at most `SPEND_CAP_USD`, and the merchant is
on the allowlist. Layer three: Executor policy (section 6) on outside tools.

**Fallback.** If the chat stream itself fails (Spike A), the dashboard's own buttons call the same scan and approval
endpoints. The approval card never depends on the chat stream.

**Proof.** The tool list (no spending tool); the approvals table; trace chips tagged Mastra.

---

## 3. Exa: real-time prices across channels

**Use case.** For each repeat item, search three channels: **local** (store pickup pages), **shipped** (US
e-commerce) and **long-haul** (cross-border). Exa returns page content fresh enough to read a price from. We ask for
structured output so each result is a typed offer, then compute landed cost in code.

**Demo moment.** The scan view: three channels light up with the query text and the count of results, then the
landed-cost table. The Exa line for Q&A: the agent searched more of the web in 30 seconds than a person would in an hour.

**Wiring (from Exa docs; the exact schema is settled in Spike C).**

```ts
import Exa from 'exa-js'
const exa = new Exa()                                   // reads EXA_API_KEY

const res = await exa.search(`${item.name} price`, {
  type: 'auto',                                          // ~1s; use 'fast' or 'instant' if latency bites
  numResults: 8,
  includeDomains: channel.domains,
  contents: { highlights: true, maxAgeHours: 0 },        // force fresh page content for prices
  outputSchema: offersSchema,                            // { offers: [{ retailer, price, shipping, pack_quantity, unit, url, in_stock }] }
})
// res.output.content = typed offers, res.output.grounding = sources and confidence
```

- Exa limits object schemas to 10 properties in total (nested and array item properties count) and 2 levels of
  nesting. The offer shape above fits.
- `maxAgeHours: 0` forces a fresh fetch and adds latency; use it only on the scan, not on chat lookups.
- Exa is a lead generator. **Kernel re-reads the winning page** before anything is proposed, so the number on the
  approval card is the live page price.
- Cost is small: the docs show about $0.007 per search; 12 items across 3 channels is roughly a quarter.

**Fallback.** If `outputSchema` extraction is unreliable (Spike C), request `highlights` and extract with an LLM call
using the same Zod schema.

**Proof.** Trace chips with queries; the `offers` table keeps URL and fetched-at for every price.

---

## 4. Fly.io Sprites: the agent's always-on computer

**Use case.** A small TypeScript worker runs on a Sprite: it polls prices for every active watch, writes each
observation to Neon, emails an alert on a dip, and sends the daily briefing. This is the "90 days, not a laptop demo"
story. The worker should be **running by 1:45 PM** so the demo shows hours of real history.

**Demo moment.** A watch card shows "Watching on a Sprite since 1:45 PM, N checks, last price $X" and a sparkline of real
observations.

**Wiring (from Sprites docs).**

```ts
import { SpritesClient } from '@fly/sprites'
const client = new SpritesClient(process.env.SPRITES_TOKEN!)
const sprite = client.sprite('buyer-worker')
await sprite.exec('node worker/dist/index.js')   // deployment details settled in Spike F
```

- Each Sprite has its own HTTPS URL on port 8080 and wakes on an incoming request. Disk persists across sleep.
- **Sprites sleep when idle.** The docs list what keeps one awake: an in-flight HTTP request, output from an attached
  session, an open TCP connection, or an active task (renewable, max 1 hour). Spike F must prove the worker keeps polling
  for 30 minutes with no client attached.
- The same `worker/` code runs locally with one command, so a failed deploy changes where it runs, not what it does.
- **Verified mechanism (docs, Oct 4):** run the worker as a Sprite *service* (`sprite-env services create worker --cmd
  node --args "dist/index.js"`) so it restarts, and hold a Sprite *task* (`POST /v1/tasks {"name":"worker","expire":"1h"}`
  over `/.sprite/api.sock`, renewed with `PUT` before it expires) so the Sprite stays awake. A paused Sprite drops open
  TCP connections, so long-lived sockets (the AgentMail WebSocket) do **not** run on the Sprite; they run in the agent
  server. Docs: https://docs.fly.io/sprites/keeping-sprites-running.md

**Fallback.** A scheduled ping to the Sprite URL wakes it for each poll cycle. Last resort: run the worker locally and
say so.

**Proof.** `watch_observations` rows with timestamps; the watch card; README section "Always-on worker".

---

## 5. Kernel: verify on the real page, then buy

**Use case.** Two jobs, both on real websites.

1. **Verify (read-only).** Open the winning offer's page in a cloud browser and read the live price and stock.
2. **Checkout (approval-gated).** After approval, add to cart and check out. Payment details live in a **Kernel Vault**
   and are filled into the page without passing through our app or the model.

**Demo moment.** The live browser card: the audience watches the agent use a real checkout page. Replay is saved.

**Wiring (from Kernel docs).**

```ts
import Kernel from '@onkernel/sdk'
const kernel = new Kernel()                              // reads KERNEL_API_KEY

const browser = await kernel.browsers.create()           // returns session_id, cdp_ws_url, browser_live_view_url
try {
  const r = await kernel.browsers.playwright.execute(browser.session_id, {
    code: `await page.goto(url); return await page.title();`,
  })
} finally {
  await kernel.browsers.deleteByID(browser.session_id)
}
```

- Headful browsers (the default) support live view and replays. A browser stays alive while something is driving it or a
  live-view viewer is open, then goes to standby after a few seconds with none, so keep the live-view card mounted.
- `CHECKOUT_MODE=review` stops at the order-review page. `CHECKOUT_MODE=place` completes the order. We switch to `place`
  only after two clean rehearsals.
- Pick a guest-checkout merchant by 1:30 PM. Avoid sites that force login or 2FA.

**Fallback.** If the live view will not embed (Spike B), open the live-view URL in a second window beside the app.

**Proof.** Saved replay; the `approvals` row and order confirmation; trace chips tagged Kernel.

---

## 6. Executor: one gateway for the agent's outside tools

**Use case.** Executor is an MCP gateway: connect each integration once, and the agent sees a single tool with search,
describe and call. Credentials are attached on the host side, so the model never sees a raw token. Each tool has a
policy of allow, ask or block, with sensible defaults from the source (for example, reads allowed, writes ask).

For the Buyer, Executor fronts the outside tools the agent uses beyond the core pipeline:

- the **AgentMail MCP server** (hosted at `https://mcp.agentmail.to/mcp`, API key in an `x-api-key` header) for sending
  mail: sending is an **ask** by default, so briefings and alerts are visible policy decisions;
- the **Exa hosted MCP server** (`https://mcp.exa.ai/mcp`) for ad-hoc research questions typed into the chat;
- one **OpenAPI source for cost inputs** (shipping quotes or duty lookups) if a suitable public spec is found.

The batch scan itself calls Exa through the SDK because it needs `outputSchema` and `maxAgeHours`. That split is
deliberate and stated in the README.

**Demo moment.** The trace shows `executor · policy: ask` before a send, and `policy: allow` for a read.

**Wiring (Mastra `MCPClient`; the Executor endpoint and auth are settled in Spike G).**

```ts
import { MCPClient } from '@mastra/mcp'

export const executor = new MCPClient({
  id: 'executor',
  servers: {
    executor: {
      url: new URL(process.env.EXECUTOR_MCP_URL!),
      requestInit: { headers: { Authorization: `Bearer ${process.env.EXECUTOR_API_KEY}` } },
      requireToolApproval: ({ toolName }) => /send|create|delete/i.test(toolName),
    },
  },
})
```

Executor can run as a desktop app, a CLI service, a Docker image, or hosted Cloud (free for up to three people).
Executor usage is free during the hack. Pick whichever connects fastest; Cloud is the quickest start.

**Fallback.** If the gateway will not connect in Spike G, those tools call their SDKs directly and Executor appears on
a policy screen only. Ask Rhys Sullivan at the booth if the endpoint or auth is unclear; this is the sponsor most
likely to need a human answer.

**Proof.** Trace entries with policy decisions; a screenshot of the Executor source list in the README.

---

## 7. assistant-ui: the entire chat surface

**Use case.** assistant-ui is built on shadcn/ui and Tailwind, which matches our design stack. It gives us streaming,
stop, edit-and-regenerate with branches, thread list and suggestions. Tool results render as designed cards instead of
text: a **price comparison card**, an **approval card** (merchant, amount, cap, formula, Approve and Decline) and a
**live browser card**. The approval card is the signature interaction and gets the most polish. This is our entry for
the Best UI side quest.

**Demo moment.** Tap Approve on the card; the Kernel live view appears in the same conversation.

**Wiring (from assistant-ui and Mastra docs).**

```bash
npx assistant-ui@latest create        # scaffolds the Next.js app
```

```tsx
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/ai-sdk'   // v7 package
const runtime = useChatRuntime({
  transport: new AssistantChatTransport({ api: `${process.env.NEXT_PUBLIC_API_BASE}/chat/buyer` }),
})
```

- Tool rendering uses assistant-ui's tool-UI registration; each tool name maps to a React card.
- Install every `ai`, `@ai-sdk/*`, `@assistant-ui/*` and `@mastra/*` package at `@latest` together. Do not copy code
  from examples written for `ai@5` or `ai@6` (including `mastra-ai/ui-dojo`), and do not use `assistant-ui/tool-ui`
  (archived Aug 2026; its widgets moved into assistant-ui elements).
- Starting points from the assistant-ui elements registry, restyled to our tokens:
  `npx assistant-ui@latest add elements-approval-card` and `elements-trace-waterfall`. There is no comparison element,
  so the price card is hand-built.
- Assistant Cloud (a prize item) is optional and not part of the plan; Mastra memory on Neon covers persistence.

**Fallback.** If a custom card fails, render the default tool UI with the same data and keep the approval path working.

**Proof.** The running UI; README GIF; component files under `web/`.

---

## 8. AgentMail: the agent has its own inbox

**Use case.** The agent owns an inbox. You forward a receipt and it arrives with `extractedText` (quoted history
stripped, text pulled from PDF and Word attachments). The same inbox sends the **daily briefing** ("3 items you bought
last month could have been $15 cheaper") and **watch alerts**. Labels track state (`received`, `processed`, `needs-review`).

**Demo moment.** Forward a real receipt on stage and watch the purchase graph build. Show the briefing in an inbox.

**Wiring (from AgentMail docs).**

```ts
import { AgentMailClient } from 'agentmail'
const client = new AgentMailClient()                     // reads AGENTMAIL_API_KEY

const socket = await client.websockets.connect()
socket.on('message', async (e) => {
  if (e.type === 'event' && e.eventType === 'message.received') { /* enqueue ingest(e.message) */ }
})
await socket.waitForOpen()
socket.sendSubscribe({ type: 'subscribe', inboxIds: [process.env.AGENTMAIL_INBOX_ID!] })
```

- **WebSocket, not webhooks.** WebSockets need no public URL or tunnel, which matters on venue Wi-Fi. Webhooks would need
  a tunnel and signature verification.
- Default domain is `@agentmail.to`; a custom domain needs a paid plan. The hackathon gives a 1-month dev plan.
- Sending goes through Executor's AgentMail source where connected (section 6), otherwise the SDK's `messages.send`.

**Fallback.** Poll `messages.list` every 5 seconds. Last resort: the seed loader ingests fixtures directly, and we say so.

**Proof.** Inbox screenshot; `receipts` rows with source `agentmail`; a sent briefing.

---

## 9. CodeRabbit: review loop and Best Open Source

**Use case.** Every PR is reviewed by CodeRabbit, and the repo is built to compete for Best Open Source: public,
Apache-2.0, a clear README, setup instructions, a demo GIF and a `.coderabbit.yaml` that tells the reviewer where the
risk is.

**Important constraint.** The repo has fewer than 10 stars, so CodeRabbit does **not** review automatically. A human
must post `@coderabbitai full review` on each PR (a comment from a bot account is ignored), or tick **Trigger review** in
CodeRabbit's status comment. If the repo reaches 10 stars, reviews become automatic.

**`.coderabbit.yaml` is in the repo** (validated against CodeRabbit's schema). It adds path instructions for the money math, the contract, the approval route, Kernel checkout, the schema, seed fixtures and the UI, and skips fixtures, vendored skills and the lockfile. CodeRabbit also reads `AGENTS.md` as review guidance.

**Demo moment.** Q&A: public repo, every PR reviewed, README shows real review catches.

**Proof.** `.coderabbit.yaml`; PR history; a short "Review log" in the README listing real issues it caught.

---

## Laya (not a sponsor): the fast local first pass

Laya is an open-source model that answers typed yes/no and short-choice questions about text in tens of milliseconds
with no LLM call. In the Buyer it is a cheap gate in front of the LLM, running as a local sidecar on `127.0.0.1:8787`.

- **Triage** every inbound email: is it a receipt, which retailer.
- **Buy guardrail** before proposing: does the listing look like a real offer from a real seller. A low score blocks the
  proposal; a person still approves.
- **Not used for:** math, extraction of prices, or deciding to buy.

Open items for the sidecar already on `main`:

- `SIGNIFICANCE_QUESTIONS.worth_acting` asks "is this worth acting on", which is the "what should I do" shape the Laya
  skill warns against. Replace it with a perception question and a threshold in code.
- Download the weights before leaving good Wi-Fi, then run with `HF_HUB_OFFLINE=1`.
- Run one uvicorn worker only; the lock does not span processes.
- If the sidecar is down, triage falls back to an LLM call through the Gateway (one env var, `LAYA_URL`).

Laya is the first thing cut under time pressure. See [PLAN.md](PLAN.md).

---

## Environment variables

Align with what the sponsors' CLIs write, so setup is copy and paste. PR #1's `.env.example` should be updated to match.

| Variable | Used by | Source |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | agent, worker | `neon env pull` |
| `NEON_AI_GATEWAY_TOKEN`, `NEON_AI_GATEWAY_BASE_URL` | agent, worker | Neon console |
| `LLM_MODEL_FAST`, `LLM_MODEL_CHAT` | agent | Neon model catalog |
| `EXA_API_KEY` | agent, worker | dashboard.exa.ai |
| `KERNEL_API_KEY` | agent | Kernel dashboard |
| `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` | agent, worker | AgentMail console |
| `SPRITES_TOKEN` | deploy scripts | Fly.io account |
| `EXECUTOR_MCP_URL`, `EXECUTOR_API_KEY` | agent | Executor (settled in Spike G) |
| `LAYA_URL` | agent | `http://127.0.0.1:8787`, unset to use LLM triage |
| `CHECKOUT_MODE` | agent | `review` or `place` |
| `SPEND_CAP_USD` | agent | default `25` |
| `DEMO_SAFE` | agent, web | `1` replays recorded responses, always labeled in the UI |

`.env` is never committed. Add `.gitignore` (`.env`, `.env.*`, `!.env.example`, `node_modules/`, `__pycache__/`,
`.next/`) as the first commit of the build.

## Verified constraints (checked Oct 4, ~12:15 PM)

These change how we build. Each was checked against vendor docs or source today.

| Area | Constraint | What we do |
|---|---|---|
| LLM | Neon AI Gateway needs a paid plan we do not have | **OpenAI by default** (`OPENAI_API_KEY`, `gpt-4o-mini`), **OpenRouter free router as fallback** (`OPENROUTER_API_KEY`, `https://openrouter.ai/api/v1`, model `openrouter/free`). Fallback triggers on a rate limit, an error, or a missing OpenAI key. The status page says which one served the call |
| Mastra + assistant-ui | assistant-ui needs AI SDK v7; `chatRoute` defaults to v5 | `chatRoute({ path: '/chat/:agentId', version: 'v7' })`, all AI packages at `@latest` together |
| Approval | Native v7 approval round-trip is not covered by Mastra's end-to-end tests | REST approval is the contract; native approval is a stretch |
| Sprites | Paused Sprites drop TCP; a task keeps one awake for at most 1 hour per renewal | Service plus renewed task; no WebSocket on the Sprite |
| Executor | Two products share the name: v1 (`executor.sh`, local `executor web` on :4788, policy UI with allow / require approval / block) and v2 (`v2.executor.sh`). A cloud agent cannot reach `127.0.0.1` on a laptop | Use **v1**. Run it where the agent server runs (in the dev VM while building, on the demo laptop for the demo). Setup prompt: https://executor.sh/setup-prompt.md |
| Kernel | Org renamed to `kernel`; `@onkernel/create-kernel-app` is deprecated (use `kernel create`). Payments docs: a completed fill is not proof of payment | Verify the order-review page total in code; read https://kernel.sh/docs/browsers/payments.md and https://kernel.sh/docs/vaults/fill.md |
| AgentMail | Examples pin `agentmail ^0.4`; current is 0.5.x | Install latest; treat examples as patterns only |

## Agent skills and docs servers in this repo

Vendored skills live in `.claude/skills/` (sources, commits and licenses in `.claude/skills/SOURCES.md`). Docs-only MCP
servers (no keys) are in `.cursor/mcp.json`. Each agent plan lists which skills to read.
