# Personal Professional Buyer

We were promised a utopia. This is part of it.

The top 1% of households have professional buyers — dedicated concierges whose job is to save them money, raise quality, and give them time back. Everyone else overpays on autopilot.

Our Personal Professional Buyer gives your household the same advantage. It learns what you buy and rebuy — by chat, voice, or mining your email receipts — then scans real-time prices across local, shipped, and cross-border channels, computing true landed cost and your projected yearly savings. With your tap-to-approve, it buys the cheapest option, runs price watches, and briefs you every morning.

---

Hackathon project for the **Build Personal Agents Hack** — Sun Oct 4, 2026, Terra Gallery, San Francisco.
Submissions close **4:30 PM PT**. Top-6 demos: 2 min + 1 min Q&A.

## Why this idea

- The obvious field entry (JARVIS / Chief of Staff) will be crowded — 200 hackers, one Schelling point.
  Differentiation is a multiplier the judges can't ignore.
- Nobody else will demo landed-cost comparison (local vs shipped vs China).
- A projected **yearly savings number** is the most memorable artifact a demo can produce.

See [STRATEGY.md](STRATEGY.md) and [INFLUENCE.md](INFLUENCE.md).

## How it works

1. **Learn what you buy.** The agent mines email receipts (its own AgentMail inbox) and builds your
   household purchase graph: items, brands, quantities, cadence, current sources.
2. **Scan the world.** Real-time best prices across **local** (store pickup), **shipped** (US e-commerce),
   **long-haul** (China / cross-border). Landed cost = item + shipping + estimated duties/taxes.
3. **Show the money.** Per-item savings + projected **yearly savings** if you switched channels.
4. **Act, don't just report.** With human-in-the-loop approval: buy the cheapest valid option,
   set price watches, get a daily briefing email of new savings.

Full concept: [CONCEPT.md](CONCEPT.md) · Build scope: [MVP.md](MVP.md) · Build plan: [PLAN.md](PLAN.md)

## Sponsor stack: what each one does

Every co-host tool has a real job in the Buyer, plus CodeRabbit for the open-source track.
Wiring, fallbacks and proof for each are in [techStack.md](techStack.md).

| Sponsor | What it does for the Buyer | Status |
|---|---|---|
| **Neon** | Postgres holds the purchase graph, price history and approvals; Mastra memory lives there; the AI Gateway serves every LLM call | Planned |
| **Mastra** | The agent: typed tools, ingest workflow, memory, tracing, and an approval gate so the model can propose a purchase but never execute one | Planned |
| **Exa** | Live price discovery across local, shipped and cross-border channels, returned as typed offers | Planned |
| **Fly.io** (Sprites) | An always-on worker that watches prices and sends the daily briefing, with real observation history | Planned |
| **Kernel** | Re-reads the winning price on the real page, then checks out with a live view; payment details stay in a vault, out of the app and the model | Planned |
| **Executor** | One MCP gateway for the agent's outside tools, with per-tool allow / ask / block policy | Planned |
| **assistant-ui** | The whole chat surface: streaming, edit and regenerate, price cards, the approval card | Planned |
| **AgentMail** | The agent's own inbox: receives forwarded receipts, sends the daily briefing and price alerts | Planned |
| **CodeRabbit** | Reviews every pull request on this public, Apache-2.0 repo | Planned |

Also in the stack: [Laya](https://github.com/NandhaKishorM/laya), an open-source local model used as a fast first-pass
gate (receipt triage, buy guardrail) before any LLM call.

Status values: **Planned**, **Spiking**, **Live**. A row only says **Live** once it works end to end in the demo path.

## Quickstart

> 🚧 Live hackathon build — the full quickstart lands with the first code push today.
> Skeleton below so contributors know where it's going.

```bash
git clone https://github.com/stevenknowswhy/ProfessionalBuyer.git
cd ProfessionalBuyer
cp .env.example .env   # add EXA_API_KEY, KERNEL_API_KEY, AGENTMAIL_API_KEY, NEON_DATABASE_URL, …
# TODO(team): install + seed + dev commands — see CONTRIBUTING.md
```

Contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md)

## Files

- [CONCEPT.md](CONCEPT.md) — the idea, agent-ified feature set, demo money-shot, scope cuts
- [JUDGES.md](JUDGES.md) — all 11 judges: who they are, what they care about, what catches their eye
- [INFLUENCE.md](INFLUENCE.md) — who carries the panel + how deliberation dynamics work
- [MATRIX.md](MATRIX.md) — scored project matrix (7 ideas × 11 judges)
- [STRATEGY.md](STRATEGY.md) — judging strategy: demo flow, judge-baiting, side quests, don'ts
- [MVP.md](MVP.md) — hack-day build scope: stack, priority slices, cuts, 2-min demo script
- [PLAN.md](PLAN.md) — build plan: architecture, schedule and gates, risks and spikes, UI direction
- [techStack.md](techStack.md) — every sponsor's use case, wiring, fallback and proof
- [DECISIONS.md](DECISIONS.md) — decision log
- [research/](research/) — source research report + judge source links

## Status

- [x] Research: judges, influence, past editions (first edition — no past winners)
- [x] Idea selected: Personal Professional Buyer (differentiation thesis)
- [x] Build plan and sponsor use cases written ([PLAN.md](PLAN.md), [techStack.md](techStack.md))
- [ ] MVP build (10:30 AM – 4:30 PM PT, submissions close 4:30 PM)
- [ ] Submission via build-personal-agents.com
