# Frontend agent plan

Written Sun Oct 4, ~12:00 PM PT. Submissions close **4:30 PM PT**. Feature freeze 4:00 PM.
Read first: [PLAN.md](PLAN.md) (section 8, "UI direction: the Awwwards bar", is your brief), [CONTRACT.md](CONTRACT.md) (the interface you consume), [techStack.md](techStack.md) (assistant-ui wiring).
Counterparts, running in parallel: [PLAN-backend.md](PLAN-backend.md) (core API) and [PLAN-integrations.md](PLAN-integrations.md) (Kernel, Sprite worker, AgentMail, Laya). You only ever talk to the core API. You never wait for either. A release agent ([PLAN-release.md](PLAN-release.md)) joins at 2:45 to test and report bugs to you.

## Mission

Build the interface so that it looks like an Awwwards submission and carries the demo. It is our **Best UI** entry: a concierge's private ledger, calm and precise, not an AI dashboard. The whole demo runs on one screen.

## Owns

`web/` only. Reads `contract/` ([change rules](CONTRACT.md#changing-the-contract)). Never edit `agent/`, `integrations/`, `worker/`, `db/`, `seed/`.

Branch: `cursor/frontend-ui-5766`. Open small PRs into `main` at every gate. Do not let a branch sit unmerged for more than 45 minutes.

## Rules that decide everything

1. **Fixtures first, backend later.** The app runs with no backend: a data layer reads `NEXT_PUBLIC_API_BASE`. If it is unset or `NEXT_PUBLIC_USE_FIXTURES=1`, it serves `@buyer/contract/fixtures/*.sample.json`, including a fake trace stream and a scripted approval. When the backend is up, set the base URL and nothing else changes. Build one thin `web/lib/api.ts` that validates every response with the contract's Zod schemas.
2. **Never compute or type a dollar figure.** Display what the contract provides, formatted with `formatUsd`. The one formula text in the UI is the "How this was computed" drawer, filled from `SavingsRun.inputs` and the item rows.
3. **Label everything that is not live** ([rules](CONTRACT.md#labeling-rules-the-frontend-enforces)). A sample or replayed number never looks live.
4. **Build the `/dev` gallery early.** Every component is rendered on `/dev` with fixture states: loading, empty, normal, error, excluded offer, blocked approval. It is how you design without the backend and how the human reviews.
5. **Demo path before decoration.** Order: the Number, price table, approval card, live browser card, trace panel, ledger, landing. Landing is the first cut.
6. **Self-host everything.** Fonts via `next/font`, no CDN, no remote images on the demo path. Venue Wi-Fi is bad.

## Stack

Next.js (App Router) on :3000, Tailwind, shadcn/ui, Motion (`motion/react`), assistant-ui. Create the app with `npx assistant-ui@latest create` inside `web/` (or add assistant-ui to a Next app), then wire `useChatRuntime` from `@assistant-ui/ai-sdk` (the AI SDK v7 package) with `AssistantChatTransport({ api: `${API_BASE}/chat/buyer` })`. Install `ai`, `@ai-sdk/*` and `@assistant-ui/*` at `@latest` together; do not copy code written for `ai@5` or `ai@6`, and do not use the archived `assistant-ui/tool-ui`. In fixture mode, `/chat/buyer` is replaced by a local scripted route that streams the canned tool calls from `ToolResults` so the chat is designed and testable offline. Add `@buyer/contract` as a workspace dependency (`"@buyer/contract": "workspace:*"`) and set `transpilePackages: ["@buyer/contract"]` in `next.config`, since the package ships TypeScript source. Import the package root only (never `@buyer/contract/offer-hash`, which is server-side). Register one tool UI per name in `ToolResults`: `showSavings`, `showOffers`, `proposePurchase`, `showLiveView`.

## Skills and components

- **Read these skills before coding** (in `.claude/skills/`): `assistant-ui`, `assistant-ui-setup` (see `references/mastra.md`, "Separate server"), `assistant-ui-tools`, `assistant-ui-elements`, `assistant-ui-runtime`, `shadcn`, `frontend-design`, `emil-design-eng`. Use `review-animations` and `web-design-guidelines` as review passes in F4. Docs MCP servers for assistant-ui, shadcn and Mastra are in `.cursor/mcp.json`.
- **The Number:** `@number-flow/react` (digit roll, `Intl` currency formatting, honors reduced motion). Size the parent element, style via `::part()`, use `tabular-nums`.
- **Approval card and trace panel:** start from `npx assistant-ui@latest add elements-approval-card elements-trace-waterfall`, then restyle completely to our tokens. The approval card always calls the REST approve and decline endpoints (no native tool approval).
- **Price card:** hand-built (there is no comparison element).
- **Sparklines:** hand-written SVG `<polyline>`, no chart library.
- **Avoid** the generic AI look: Magic UI shimmer and border beams, Aceternity spotlights and auroras, React Bits (Commons Clause license, heavy dependencies), and the default assistant-ui shimmer.

## Design brief (summary of PLAN.md section 8)

- **Not the default AI look.** Warm cream plus a serif is a known AI-generated tell. Pick a paper tone that is not `#F4F1EA`-ish cream and an accent that is not terracotta; use sentence-case labels, no `A · B · C` meta strings, and no "→" on every button. Put the token plan (colors, type roles, a wireframe sketch) in the F0 PR description.
- **Color in OKLCH.** Paper background, deep ink text, one restrained green for savings, one signal color for "needs your approval". Two neutrals plus two accents. One mode, done well.
- **Type.** Display serif for headlines and the Number, clean sans for UI, mono for formulas. Tabular figures on every money value.
- **Layout.** Three zones: household ledger left, concierge conversation center, workbench right (trace, live browser, savings). All three visible at 1440 and 1920 widths so the demo never changes page.
- **Craft rules.** Concentric radii; shadows as borders; optical alignment; 40px minimum hit areas; visible focus rings; motion 150 to 250 ms ease-out with 40 ms stagger and springs for layout; nothing on the demo path blocks over 300 ms; skeletons instead of spinners; designed empty states; `text-wrap: balance` on headings; honor `prefers-reduced-motion`; favicon, OG image, real 404.
- **Brand.** Wordmark "Margin" in the UI (the repo keeps its name). One line of copy from the project: "We were promised a utopia. This is part of it."

## Timeline

Times are PT. Each block ends with something to look at and a PR.

### F0. 12:00 to 12:40: shell and design system

- `web/` Next app, Tailwind, shadcn, fonts, OKLCH tokens, three-zone layout with static content.
- `web/lib/api.ts` with fixture mode and Zod validation, plus a React Query or SWR style hook per endpoint. SSE hook for the trace stream.
- `/dev` gallery route exists.
- **Done when:** `pnpm --filter web dev` shows the three-zone shell on fixture data. Merge the PR.

### F1. 12:40 to 1:30: the demo path in fixtures

- **The Number:** full-screen takeover, digit-roll count-up over about 1.2 seconds, one-line provenance ("14 receipts, 6 items, 3 channels"), and the "How this was computed" drawer (formula, each item's inputs, the excluded items with reasons, "sales tax excluded", "duty is an estimate").
- **Price comparison card** (`showOffers`): channel rows, delivered and unit cost, best highlighted, excluded offers shown with reasons, "Verified by Kernel" mark when `verifiedByKernel`.
- **Household ledger** (left): items with purchase cadence, "not enough history" state.
- **Done when:** the Number plays from fixtures and the drawer's figures match `savings.sample.json` exactly.

### F2. 1:30 to 2:30: chat, approval and live view

- assistant-ui thread: streaming, stop, edit and regenerate with branches, suggestion chips ("Scan my receipts", "Buy the cheapest"), thread list. Tool UIs registered for all four tools.
- **Approval card (signature interaction, most polish):** merchant, amount against the cap, the offer hash line in small mono, the formula, Approve and Decline. Calls `POST /api/approvals/:id/approve` or `/decline`, shows `executing` with a progress state, then `completed`, or `blocked` with the plain reason. Handles all statuses in the contract.
- **Live browser card** (`showLiveView`): iframe on `liveViewUrl` with a loading state and a fallback "Open live view in a new window" link, since embedding can be blocked (backend Spike B). Show the replay link when `replayUrl` exists.
- **Trace panel** (right): the SSE stream with a sponsor chip per event (name, label, duration, Executor's `allow/ask/block` mark), grouped by run, newest at the bottom, auto-scroll that stops when the user scrolls.
- **Done when:** with fixtures, a person can click through scan, the Number, "buy the cheapest", approve, and see the live view card, with no console errors.

### F3. 2:30 to 3:15: real backend and sponsor surfaces

- Set `NEXT_PUBLIC_API_BASE=http://localhost:4111` and run against the backend. Fix mismatches **in the web code first**; if the backend deviates from the contract, tell the human in the PR rather than working around it silently.
- **Preflight screen** (`/status`): `Health` as a grid of sponsor tiles with green, red, and a labeled "fallback" state. This doubles as the sponsor proof for judges.
- **Watches panel:** "Watching since 1:45 PM, 190 checks" from `Watch` and `WatchObservation`, with a small sparkline of the price history (Fly.io proof).
- **Inbox:** show the agent's address (from `Health` note or an env) and an "email received" toast when a new receipt appears in `household`.
- **Done when:** the whole path works against the real backend with no fixtures, and `provenance` badges are right.

### F4. 3:15 to 4:00: beautiful and rehearsed

- Design pass at 1440 and 1920 widths against the craft rules. Screenshots for the design review at 3:15; fix list capped at 30 minutes.
- Landing page (`/`) with the project line and a single scroll story ending in "Open the buyer". If behind schedule, a single hero is enough.
- Lighthouse performance and accessibility at least 90 on `/` and the app. No layout shift during a scan.
- `prefers-reduced-motion`, focus rings, keyboard path through approve.
- Favicon, OG image, 404. A 15-second GIF of the demo path saved to `docs/demo.gif` (human can also record).
- **Feature freeze at 4:00.** After that, fixes only.

## Acceptance checklist (all must be true by 4:00)

- [ ] `pnpm --filter web build` passes with no type errors, in fixture mode and against the backend.
- [ ] Every response is validated with a contract schema; an invalid response shows a designed error state, not a blank screen.
- [ ] The Number counts up from `SavingsRun.yearlySavingsCents` and its drawer lists every input.
- [ ] Tool UIs exist for `showSavings`, `showOffers`, `proposePurchase`, `showLiveView`.
- [ ] The approval card handles `pending`, `executing`, `completed`, `declined`, `blocked`, `failed`, and review-mode versus place-mode wording.
- [ ] Non-live data is always badged.
- [ ] The trace panel shows a chip for each sponsor, and the `/status` page covers all nine plus Laya.
- [ ] Lighthouse at least 90 on `/` and the app; keyboard and reduced-motion work.
- [ ] No remote font or image on the demo path.

## What to ask the human for (solo owner)

- A design review from someone who did not build it, from screenshots at 3:15.
- Confirmation of the wordmark ("Margin") by 3:30.
- A decision between a landing scroll story and a single hero if behind at 3:00.

## Kickoff prompt (paste into the frontend cloud agent)

```
You are the FRONTEND agent for "Personal Professional Buyer", a hackathon app due 4:30 PM PT today (feature freeze 4:00 PM). I am the only human on the team. The UI is our Best-UI-prize entry and must look like an Awwwards submission.

Read, in this order: PLAN-frontend.md (your plan), CONTRACT.md (the interface), PLAN.md section 8 (design direction), techStack.md (assistant-ui wiring), contract/src/index.ts and contract/fixtures/*.sample.json.

Work on branch cursor/frontend-ui-5766, branched from main. Do not edit anything outside web/ except additive contract changes per CONTRACT.md. Two other agents build the backend in parallel (core API and integrations); you only talk to the core API.

Build web/ so it runs fully on the sample fixtures with no backend, with one env var (NEXT_PUBLIC_API_BASE) to switch to the real API. Before coding, read the skills listed in PLAN-frontend.md and AGENTS.md. Start with F0: shell, design tokens, three-zone layout, the fixture data layer and a /dev gallery, and open a PR immediately. Then follow the timeline. Never compute or type a dollar figure: display what the contract provides. Open small PRs at every gate.
```
