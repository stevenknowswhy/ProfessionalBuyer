# Integrations agent plan

Written Sun Oct 4, ~12:00 PM PT. Submissions close **4:30 PM PT**. Feature freeze 4:00 PM.
Read first: [CONTRACT.md](CONTRACT.md), [`contract/src/integrations.ts`](contract/src/integrations.ts) (the functions you implement), [`db/schema.sql`](db/schema.sql), [techStack.md](techStack.md) sections 4, 5, 8 and Laya.
Counterparts, running in parallel: [PLAN-backend.md](PLAN-backend.md) (core) and [PLAN-frontend.md](PLAN-frontend.md) (UI). You never wait for them.

## Mission

## Scope lock

Do not build Kernel checkout, live view, or a Vault payment. The product only stores an offer URL. Your jobs are AgentMail (inbox `signal-os-concierge@agentmail.to`) and the Sprite worker `buyer-worker` (org `stefano94120`, URL https://buyer-worker-b3y4b.sprites.app), which is already created. Replace Laya triage with Jev: `typesafe/jev-1.13` via `POST https://openrouter.ai/api/alpha/decisions` and `OPENROUTER_API_KEY`. Code already exists on this branch for a Kernel client and a Laya client. Leave the Kernel client unused and switch triage to Jev.

Own the four integrations that are slow, flaky, and need their own trial and error, so they do not stall the core pipeline:

- **Kernel:** read-only offer verification and approval-gated checkout with live view, Vault payment and replays.
- **Fly.io Sprites:** the always-on price-watch worker, **writing real observations by 1:45 PM**.
- **AgentMail:** the agent's inbox (inbound receipts) and outbound mail (briefing, alerts).
- **Laya:** the local triage sidecar, with an LLM fallback behind the same function.

## Owns

`integrations/` (new workspace package `@buyer/integrations`), `worker/`, `laya-sidecar/`. Shares `contract/` ([change rules](CONTRACT.md#changing-the-contract)). Never edit `agent/`, `web/`, `db/schema.sql` (ask core for additive columns in your PR description).

Branch: `cursor/integrations-5766`. Small PRs into `main` at every gate.

## Skills and docs

- **Read before coding** (in `.claude/skills/`): `kernel-typescript-sdk`, `sprites`, `neon-postgres`, and the AgentMail skills `agentmail`, `agentmail-toolkit`, `agentmail-send-email`, `agentmail-check-email`, `agentmail-manage-inboxes`, `agentmail-mcp`, `agentmail-cli`.
- Kernel: [live view](https://kernel.sh/docs/browsers/live-view.md), [vault fill](https://kernel.sh/docs/vaults/fill.md), [payments](https://kernel.sh/docs/browsers/payments.md). A completed fill is not proof of payment: check the order-review total in code. The org is now `kernel`; ignore the deprecated `@onkernel/create-kernel-app`.
- Sprites: [keeping Sprites running](https://docs.fly.io/sprites/keeping-sprites-running.md). AgentMail: [WebSocket quickstart](https://docs.agentmail.to/websockets/quickstart.md); examples in `agentmail-to/agentmail-examples` pin `agentmail ^0.4` (current 0.5.x), so use them for patterns only.

## Rules

1. **Implement the interfaces exactly.** `@buyer/integrations` default-exports an object satisfying `Integrations`. Core swaps its stub for yours with one import, so a signature change is a contract change.
2. **Every function takes `emit: EmitTrace`** and reports each external call with the right sponsor tag (`kernel`, `agentmail`, `fly`, `laya`) and duration.
3. **Each integration has a labeled fallback** and `health()` reports it truthfully.
4. **Money safety in checkout.** Abort if the page total differs from `expectedTotalCents`. Never log payment data. Payment comes from a Kernel Vault, never from env or the model. `mode: "review"` must stop at the order-review page.
5. **The worker never calls the agent server.** It reads `watches` and writes `watch_observations` and `events` in Neon directly. It must run identically on a laptop.

## Timeline (PT)

### I0. 12:00 to 12:40: package and the worker first

- `integrations/` package with a stub implementation of `Integrations` (fallback values, `usingFallback: true`) so core can import it from the first PR. Merge immediately.
- `worker/`: a TypeScript loop that, for each active `watches` row, fetches the offer page (plain `fetch` plus a simple price extractor, or Exa contents), inserts a `watch_observations` row and an `events` row tagged `fly`. If `watches` is empty, insert watches for the best offer of each featured item from the latest `savings_runs` row, or from `contract/fixtures/savings.sample.json` before core has data.
- **Done when:** `pnpm --filter worker start` writes observations to Neon locally.

### I1. 12:40 to 1:45: Sprite live (hard deadline 1:45)

- Deploy `worker/` to a Sprite with `@fly/sprites`. Run it as a Sprite **service** (`sprite-env services create worker --cmd node --args "dist/index.js"`) so it restarts, and hold a Sprite **task** (`POST /v1/tasks {"name":"worker","expire":"1h"}` over `/.sprite/api.sock`, renewed with `PUT` from inside the worker every 30 minutes) so it stays awake. Prove it with no client attached (Spike F). Fallback: an external scheduled ping to the Sprite URL each cycle. Never run the AgentMail WebSocket on the Sprite: a paused Sprite drops TCP connections.
- Set `runs_on = 'sprite'` on the watches. Record the start time.
- **Done when:** observations keep arriving from the Sprite for 15 minutes with your session detached. Post the count in the PR.

### I2. 1:45 to 2:45: Kernel and the merchant

- `kernel.verifyOffer`: create a browser, read title, price and stock with `playwright.execute`, return `VerifiedOffer`, delete the browser. (Spike B, read-only part.)
- **Pick the demo merchant.** Shortlist three guest-checkout merchants (checkout with email and address, no account, login, 2FA or CAPTCHA) for an item whose delivered cost is at most `SPEND_CAP_USD` (default $25). Load each in Kernel to confirm. Put the choice, URL and two alternates in your PR description so the human records it in `DECISIONS.md`. Core puts it on the allowlist.
- `kernel.checkout`: headful browser, call `onLiveView` immediately with `browser_live_view_url`, add to cart, guest checkout, fill shipping, payment from the Kernel Vault, stop at review in `review` mode. Compare the page total with `expectedTotalCents`. Return the replay URL.
- **Done when:** two `review` runs in a row reach the order-review page on the chosen merchant with a working live view URL and replay.

### I3. 2:45 to 3:30: AgentMail and Laya

- `mail.onInbound`: AgentMail WebSocket (`client.websockets.connect()`), map to `InboundEmail` with `extractedText`; fallback polling `messages.list` every 5 seconds. Provide a runnable entry (`pnpm --filter @buyer/integrations inbox`) that calls core's `ingestReceipt` over HTTP or is imported by core; agree the wiring in your PR description. (Spike D.)
- `mail.send` for the briefing and watch alerts; `mail.inboxAddress()`.
- `triage.isReceipt`: call the Laya sidecar on `127.0.0.1:8787` with the questions in `laya-sidecar/questions.py`; when the sidecar is down, LLM fallback with `via: "llm"`. Document in `laya-sidecar/README.md` how to start it offline with `HF_HUB_OFFLINE=1`.
- `health()` for all four.
- **Done when:** a forwarded email reaches `ingestReceipt` within 30 seconds, and a briefing arrives in a real inbox.

### I4. 3:30 to 4:00: harden

- Rehearse checkout with the release agent. Keep `review` unless two clean runs and the human agrees to one `place` run at or under the cap.
- Put "Always-on worker", "Verified checkout" and "The agent's inbox" README text in your PR description.
- **Feature freeze at 4:00.**

## Acceptance checklist

- [ ] `@buyer/integrations` satisfies `Integrations` (typecheck) and core imports it.
- [ ] Sprite worker writing observations since before 2:00 PM, with no client attached.
- [ ] Checkout aborts on a total mismatch and stops at review in `review` mode. Live view and replay URLs returned.
- [ ] Inbound email reaches ingest; briefing sends.
- [ ] Laya and its fallback both work; `via` tells which ran.
- [ ] Every external call emits a trace event; `health()` is honest.

## What to ask the human for

Keys for Kernel, Fly (Sprites token) and AgentMail as Cursor Cloud Agent secrets; a Kernel Vault with a low-limit payment method; real receipts forwarded to the inbox by 2:00 PM; Laya weights downloaded on the demo laptop.

## Kickoff prompt

```
You are the INTEGRATIONS agent for "Personal Professional Buyer", a hackathon app due 4:30 PM PT today (feature freeze 4:00 PM). I am the only human. Two other agents work in parallel: BACKEND-CORE (agent/, db/) and FRONTEND (web/).

Read in order: PLAN-integrations.md (your plan), contract/src/integrations.ts (the interface you implement), CONTRACT.md, db/schema.sql, techStack.md sections 4, 5, 8 and Laya.

Work on branch cursor/integrations-5766 from main. Edit only integrations/, worker/, laya-sidecar/, plus additive contract changes per CONTRACT.md.

Before coding, read the skills listed in PLAN-integrations.md and AGENTS.md. Start with I0: publish a stub @buyer/integrations package and a worker/ that writes watch observations to Neon, and open a PR immediately. The Sprite worker must be live and writing observations by 1:45 PM; that deadline beats everything else. Then Kernel verify and guest checkout (review mode), then AgentMail and Laya. Every external call emits a trace event and has a labeled fallback. If a key is missing, use the fallback and tell me in the PR description; do not stop.
```
