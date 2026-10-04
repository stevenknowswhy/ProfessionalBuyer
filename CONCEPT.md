# Concept: Personal Professional Buyer

## Elevator pitch

Every household rebuys the same ~50 items on autopilot and overpays on most of them.
The Personal Professional Buyer is the agent that finds what your household overpays for —
then fixes it, with your approval.

## How it works

1. **Learn what you buy.** The agent mines email receipts (its own AgentMail inbox — you forward
   receipts, or it connects to your mailbox) and builds your household purchase graph:
   items, brands, quantities, cadence, current sources.
2. **Scan the world.** For each repeat item it pulls real-time best prices across three channels:
   **local** (store pickup), **shipped** (US e-commerce), **long-haul** (China / cross-border).
   Landed cost = item + shipping + estimated duties/taxes.
3. **Show the money.** Per-item savings + projected **yearly savings** if you switched channels.
4. **Act, don't just report.** With human-in-the-loop approval: buy the cheapest valid option,
   set price watches ("buy when it dips below $X"), get a daily briefing email of new savings.

## Agent-ified features (what makes it an agent, not a dashboard)

- **Receipt mining** — builds the purchase graph itself; no manual item entry.
- **Approval-gated buying** — the agent spends money only with your tap (governance story).
- **Price watches** — long-running monitors on Fly Sprites ("watch for 90 days").
- **Memory** — learns brand preferences, household size, urgency vs. savings tradeoffs
  (diapers weekly = $0.50 savings worth acting on; a toaster = not).
- **Buy-now-vs-wait** — seasonality + stock awareness (don't recommend a 30-day shipment
  for something you need Friday).
- **Observability side-panel** — live trace of the agent's reasoning
  ("scanned 12 stores → 3 cross-border matches → landed cost $4.95 savings → approval sent").
- **Generative UI** — price-comparison cards rendered inside the chat, not plain text.
- **Lifecycle cost (stretch)** — cheap blender vs durable blender over 10 years.
- **Daily briefing email** — "3 items you bought last month could have been $15 cheaper."

## Demo money-shot

A single number on screen: **"Switching these 12 items saves this household $2,400/year."**
Then the agent buys one item at the cheapest channel — live, with your tap-to-approve.
Judges remember numbers. Judges remember watching an agent spend money *safely*.

## Scope cuts (do NOT build today)

- Smart-fridge / IoT inventory integration
- Auto-sending negotiation emails to customer service (drafts only, never sent unattended)
- Unfalsifiable claims ("best time to buy is Tuesdays at 3 PM", "90% legit seller") —
  every number on screen must be defensible if a judge asks how it was computed
- Subscription-hacking v2 (detect + draft cancels) — only if the core loop is done early

## Working title

Personal Professional Buyer. Alternatives: PricePilot, BuyRight AI, Household Procurement Agent.
Pick one before submission — it goes on the repo, the one-liner, and the demo title slide.
