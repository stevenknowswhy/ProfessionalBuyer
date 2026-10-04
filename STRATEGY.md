# Judging Strategy

## The bet

Differentiation × coalition. The Buyer is the only idea in the room doing landed-cost
comparison (local / shipped / China), AND it chains the co-host stack so 8 vendor-judges
each see their thesis in the demo.

## 2-minute demo flow

1. **The hook (15s).** "Every household rebuys the same 50 items on autopilot and overpays
   on most of them. This agent finds what you overpay for."
2. **Receipt in, graph out (25s).** Forward one email receipt → the agent builds the household
   purchase graph (items, cadence, current spend). No manual entry.
3. **The scan (30s).** Live: Exa-powered price scan across local / shipped / long-haul,
   landed-cost math on screen, observability side-panel narrating the agent's reasoning.
4. **The number (15s).** Full-screen: **"$2,400/year"** projected savings. Pause. Let it land.
5. **The act (35s).** The agent proposes buying the cheapest option; you tap approve in chat;
   Kernel browser checks out on the real site, live view visible. "It doesn't just report —
   it buys, with your permission."

## Judge-baiting cheat sheet

- **Shamgunov:** "Purchase history lives in Postgres — the agent's memory compounds every month."
- **Johnston:** "Price watches run for 90 days on Sprites — a real computer, not a laptop demo."
- **da Costa:** have the company answer ready — wedge (household procurement), users, monetization
  (affiliate / subscription / % of savings).
- **Farshid:** polished chat — streaming, tap-to-approve, generative price cards. Note the dashboard
  surface differentiates from 40 chat-only entries.
- **Thorelli:** public repo + excellent README = entered for Best Open Source.
- **Aiyer:** Mastra under the hood; observability side-panel; approval gates on the buy tool.
- **Wang:** "The agent searched the web more in 30 seconds than a human would in an hour — via Exa."
- **Jue:** Kernel live view during checkout. **Never demo raw Puppeteer in front of her.**
- **Aujla:** receipt mining via the agent's own inbox + the daily briefing email.
- **Sullivan:** integrations through one MCP gateway; generative UI cards; per-tool approval policy.
- **Krehel:** sweat the UI — spacing, type, motion. Bait him with *craft*, not retry logic.

## Side quests

- **Best UI ($750, Farshid judges):** the savings dashboard + generative price cards are the entry.
  Make the "$X/year" moment beautiful.
- **Best Open Source ($10k credits, Thorelli judges):** public repo, great README, demo GIF,
  clear setup instructions. Push early — judges browse during deliberation.

## Don'ts

- No unfalsifiable numbers ("Tuesdays at 3 PM", "90% legit seller") — every on-screen number
  must survive "how did you compute that?"
- Don't let it read as a dashboard: the agent must *act* (buy with approval, watch, brief).
- Don't pitch vapor: everything in the demo must run live. A recorded fallback is fine;
  slides are not.
- Don't trash-talk other stacks. Every judge in the room sells one.
