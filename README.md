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

Full concept: [CONCEPT.md](CONCEPT.md) · Build scope: [MVP.md](MVP.md)

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
- [DECISIONS.md](DECISIONS.md) — decision log
- [research/](research/) — source research report + judge source links

## Status

- [x] Research: judges, influence, past editions (first edition — no past winners)
- [x] Idea selected: Personal Professional Buyer (differentiation thesis)
- [ ] MVP build (10:30 AM – 4:30 PM PT, submissions close 4:30 PM)
- [ ] Submission via build-personal-agents.com
