# MVP: hack-day build scope

Timebox: **10:30 AM – 4:30 PM** (~5h incl. lunch). Submission via build-personal-agents.com.
Rule: everything in the demo runs live. Cut scope before cutting the live demo.

## Stack

- **Mastra** — agent framework, Observational Memory, tool-call governance (Aiyer)
- **Exa** — real-time price/research search across the web (Wang)
- **Kernel** — browser verify + checkout on real sites, live view (Jue)
- **AgentMail** — the agent's own inbox; receipt intake + daily briefing (Aujla)
- **Neon Postgres** — purchase graph + price history; memory that compounds (Shamgunov)
- **Fly Sprites** — price watches as long-running jobs (Johnston)
- **assistant-ui** — chat with streaming + tap-to-approve (Farshid)
- **Executor** — MCP gateway for retailer/integration tools; approval policies (Sullivan)
- **Repo** — public on GitHub with README + demo GIF from the start (Thorelli)
- **UI** — savings dashboard; sweat spacing/type/motion (Krehel)

## Build slices (in priority order — stop when time runs out)

1. **Receipt → graph → scan → number.** Forward a receipt → parse line items → Exa price scan
   (local / shipped / long-haul) → landed-cost math → per-item + yearly savings dashboard.
   *This alone is a demoable product.*
2. **Approval-gated buy.** "Buy cheapest" → chat approval card → Kernel checkout on a real
   site with live view. *This makes it an agent.*
3. **Price watch.** "Watch this item; buy under $X" → Sprites job → notification on dip.
4. **Observability panel.** Live trace of tool calls + reasoning (Mastra).
5. **Daily briefing email.** Morning digest of new savings (AgentMail).
6. **Stretch:** generative price cards in chat; lifecycle-cost comparison.

## Cuts (explicit)

Smart fridge/IoT, auto-sent negotiation emails, subscription-hacking v2,
lifecycle cost if slices 1–4 aren't solid, any stat you can't defend live.

## Seed data

Prepare 2–3 real forwarded receipts (or realistic fixtures) BEFORE hacking starts —
receipt parsing is not where the day should go.

## 2-minute demo script

1. Hook: "Your household rebuys 50 items on autopilot and overpays on most."
2. Forward receipt → purchase graph appears.
3. Live scan → landed costs → observability panel narrates.
4. **$X/year** full-screen. Pause.
5. Tap approve → Kernel buys the cheapest option live.
Close: "It doesn't just find the savings. With your permission, it acts on them."
