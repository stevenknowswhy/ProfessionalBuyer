# Research Report: Build Personal Agents Hack — History, Past Winners, and Judges

## Summary

**The October 4, 2026 "Build Personal Agents Hack" at Terra Gallery (511 Harrison St, San Francisco, 9 AM–7 PM PT) is the FIRST edition of this exact hackathon.** I found no prior edition — the official site (https://build-personal-agents.com, read live Oct 4, 2026) lists only the Oct 4, 2026 date, has no archive, no past-winners page, and no Devpost page referenced anywhere. Web searches for prior "personal agents" hackathons in SF found only *different* events by *different* organizers (e.g., AI Valley's "Agents You Love" hackathon, June 2026; ClawCamp's agent hackathons). Since the event is *today*, winners are still TBD. Questions (2)–(4) about prior winners therefore have no answer: **there are none to report.** I document what CAN be known (prize structure, how judging works, where winners will likely be posted) plus related agent-hackathon history for context, and a full judge dossier.

## Q1: Has this hackathon (or a predecessor) run before?

**Verdict: No — this is the inaugural edition (high confidence, index + live site).**

Evidence:
- https://build-personal-agents.com (verified live, Oct 4 2026): one page; only date is Sunday, October 4, 2026, 9 AM–7 PM PT; Terra Gallery, 511 Harrison Street, San Francisco. No past-editions section, no winner archive, no link to any hack platform. Copy says "More prizes to come," consistent with a first event being organized live.
- Luma event https://luma.com/build-agents (index, crawled 3h before research): the sole event. Judges list matches the site exactly.
- No Devpost page, no prior Luma edition, no X/Twitter announcement of earlier editions found via multiple targeted searches ("personal agents" hackathon 2025 San Francisco winners; build-personal-agents.com history).
- MCs listed on site: Andre Landgraf (Staff Developer Advocate, Databricks) and Dan Goosewin (Goosewin Media Group) — neither has a public record of running a prior "personal agents" hackathon.

Related-but-different events (not predecessors, different organizers):
- "Agents you Love: Hackathon" by AI Valley, San Francisco, June 21, 2026 (Luma https://luma.com/b7chd233) — similar theme (personal/lovable agents), different organizers/sponsors (HydraDB, Lovable, Nebius), not the same brand.
- "Battle of the (Personal) Brains" hackathon, Sept 21, 2026, by Bright Data/Cognee/Dave Nielsen/Vasilije Markovic — different event.
- Daytona HackSprint SF (July 2026), Return of the Agents (Afore Capital, Feb 2026), Long Horizon Agents Hackathon (Sept 25, 2026, tokens&/AWS) — agent hackathons in SF, but distinct organizers and themes.

## Q2: Winning projects in prior editions

**None exist — first edition, event is today.** The prize structure for the current edition (from the site + Luma, verified live):
- 1st/2nd/3rd: primarily *credit* prizes (not cash): e.g., 1st gets $100k Neon AI Gateway credits (or $25k/member, whichever is higher), $50k Fly.io credits (or $12.5k/member), $5k Mastra, $5k Executor, $5k Exa + hoodie/goat stuffy, $1k Kernel + sweatshirt, 12-mo Assistant Cloud, 12-mo AgentMail startup plan. 2nd/3rd are scaled-down versions. Total prize pool advertised: **$280k** (mostly credits).
- Side quests (judges nominate during judging, vote after presentations; any submitted team can win, including top-three):
  - **Best Open Source Project** (CodeRabbit): $10k CodeRabbit usage credits.
  - **Best UI** (assistant-ui): $750.

## Q3: What past winners have in common

Not applicable (no prior editions). Notable inference from judging format: finalist teams demo live; judges nominate side-quest winners during judging — so a working live demo matters more than a polished write-up.

## Q4: Notable runner-up/side-quest winners

None yet. The side quests to watch: **Best Open Source** and **Best UI** (see above).

## Q5: Where to view past winning submissions

- For THIS event (winners will be announced later today): monitor the hack platform **build-personal-agents.com** ("Hack platform now open" per Luma), the Luma page https://luma.com/build-agents, and the judges'/co-hosts' X posts. No Devpost page is referenced for this event.
- For reference/comparison, agent-hackathon submissions from other 2026 SF events can be browsed on Devpost (e.g., googlecloudmultiagents.devpost.com) and in public GitHub repos, but none are affiliated with this event.

---

## Judge dossier (all 11)

### 1. Nikita Shamgunov — VP Eng, Databricks (formerly CEO of Neon, acquired by Databricks May 2025)
- Company: Databricks (data/AI platform). Databricks' 2026 story is the *agentic data stack*: Agent Bricks (agent workspace), Lakehouse RT, Genie (rebuilt as agent "Genie One" on a "Genie Ontology" context layer reading Slack/Jira/Drive + 50 apps, acting via MCP tools), Genie App Builder, Genie ZeroOps background agents (Data + AI Summit 2026 coverage). "Agents read, loop, and write differently from software built for people, and the underlying data layer has to change" (Moor Insights).
- Sources: https://moorinsightsstrategy.com/field-notes/databricks-bets-on-owning-the-agentic-data-stack-at-data-ai-summit-2026/ ; https://medium.com/next-token/data-ai-summit-2026-what-databricks-actually-announced-80e6448e9e4f ; https://www.crn.com/news/software/2024/if-you-build-them-databricks-to-launch-new-data-workflow-ai-agent-development-tools
- Impress: memory/persistence that *learns your data*; Postgres-backed agents (he's ex-Neon — the Luma page lists "Neon: backend, including AI Gateway and Postgres" as the #1 co-host stack item).

### 2. Scott Johnston — CEO, Fly.io (ex-CEO Docker; ex-Puppet/Loudcloud/Netscape)
- Company: Fly.io — July 2026 pivoted to "Computers for Agents": raised $25M Series D (co-led Dell Technologies Capital + Intel Capital; a16z, EQT, YC participating; Martin Casado joined board) and launched **Sprites** — semi-disposable agent sandboxes: "instant, cheap when idle, persistent when needed." Fly treats "long-running, stateful compute as a first-class primitive." Agent-first customers: Firecrawl, Kilocode, Plastic Labs, Phonic.
- Sources: https://fly.io/news/fly-io-launches-computers-for-agents/ ; https://www.webpronews.com/from-ceo-to-visionary-how-kurt-mackey-bet-fly-io-on-ai-agents-and-disposable-computers/ (background on the Mackey→Johnston CEO handoff and manifesto).
- Impress: an agent with a *real computer* behind it — long-running, stateful, deployed on Sprites/Fly rather than a laptop demo.

### 3. Abhi Aiyer — Co-founder/CTO, Mastra
- Company: Mastra — "the leading TypeScript framework for building production AI agents" (Gatsby team alumni). Focus: observability, governance, memory. Co-hosts weekly "AI Agents Hour" livestream (Mondays, YouTube+X). Shipped Mastra Code (open-source coding agent) and **Observational Memory** (context compression without loss), and the **Harness primitive** (any agentic workflow). Partnered with OpenBox for one-line runtime governance ("governance can't be something you bolt on six months after launch"). GitHub: @abhiaiyer91, active through Sept 29, 2026.
- Sources: https://www.youtube.com/watch?v=Hbgh3Iyd3Mk (Mastra Code demo) ; https://www.morningstar.com/news/pr-newswire/20260504ph48335/... (OpenBox/Mastra press release with Aiyer quote) ; https://github.com/abhiaiyer91
- Impress: build on Mastra; demonstrate memory that survives multi-day sessions and tool-call governance/approvals.

### 4. Jeff Wang — Co-founder, Exa
- Company: Exa (ex/Metaphor) — "the search engine for AI," API-first, no ads/SEO spam, zero-data-retention. Raised $250M (May 2026) at $2.5B valuation led by a16z after an $85M round at $700M. Customers: Cursor, Cognition, Lovable, HubSpot, Databricks. Vision: "perfect search — all information fully organized and accessible." Wang's classic quote: "Soon, AI will search the web more than humans. But search engines like Google were designed for humans, not AI."
- Sources: https://en.wedoany.com/shortnews/175274.html ($250M/a16z round) ; https://techfundingnews.com/san-franciscos-exa-raises-85m-at-700m-valuation-to-build-the-search-engine-for-ai/ ; https://techcrunch.com/2024/07/16/exa-raises-17m-lightspeed-nvidia-ycombinator-google-ai-models/928
- Impress: an agent that *lives* on fresh web data — deep research, sourcing, prospecting (Websets-style list building), using Exa over Google.

### 5. Catherine Jue — Co-founder/CEO, Kernel (YC S25; $22M seed+Series A led by Accel)
- Company: Kernel — browser infrastructure for AI agents: sandboxed Chromium on a unikernel platform, sub-150ms cold starts, stealth mode, residential proxies, CAPTCHA solving, session recording/replays, live view, MCP support, "turn any agent into an HTTPS endpoint." Open source. Works with Playwright/Puppeteer/Browser Use/Stagehand/Anthropic+OpenAI+Gemini computer-use loops.
- Sources: https://www.ycombinator.com/companies/kernel ; https://siliconangle.com/2025/10/09/kernel-raises-22m-power-browser-infrastructure-ai-agents/ ; https://github.com/api-evangelist/kernel-so
- Impress: an agent that *uses the internet like a human* — books, buys, files, navigates real sites via a Kernel browser, with visible replays/live view and credential-safety (permission scopes).

### 6. Rhys Sullivan — Founder, Executor (YC; open source)
- Company: Executor (executor.sh) — "the missing integration layer for AI agents": one MCP endpoint fronting every integration (MCP/OpenAPI/GraphQL), credentials held server-side with per-tool allow/require-approval/block policies; sandboxed TypeScript runtime; render-UI tooling so agents ship interactive UI inside the agent (his MCP Night talk demoed PostHog charts rendered inside a coding agent + a Gmail agent filtering response emails with a few lines of TypeScript). Cites Cloudflare's Code Mode write-up as backbone: "agents are good at writing code, so give them an environment to write it in."
- Sources: https://github.com/UsefulSoftwareCo/executor ; https://www.youtube.com/watch?v=kgksikB9O4c ("Mastering MCP for Next-Gen AI Agents — Rhys Sullivan, Executor | MCP Night") ; https://www.producthunt.com/@rhyssullivan/activity
- Impress: rich tool integrations through one MCP gateway + generative UI (interactive components, not plain text); show the approval-policy angle.

### 7. Simon Farshid — Founder, assistant-ui (YC; open source)
- Company: assistant-ui — open-source React library for AI chat/agent interfaces (2,000+ OSS repos, ~1.4M npm downloads/mo): streaming, conversation state, attachments, message editing, voice, agent-backend connections; generative UI (map LLM tool calls to custom components), frontend tool calls, human tool calls (approvals). Focus: "enabling human <> agent collaboration through better UX and AX (agent experience)." He judges the **Best UI** side quest ($750) — literally his company's prize.
- Sources: https://www.ycombinator.com/companies/assistant-ui ; https://www.coderabbit.ai/blog/ai-agent-ux-simon-farshid-assistant-ui (CodeRabbit "The Merge" interview: "The hard part is the state"; users expect interrupt/correct without losing the conversation)
- Impress: a genuinely polished chat UI with streaming, interruption, edit-and-rerun, approvals, generative UI — he cares about craft in the interface.

### 8. Haakam Aujla — Co-founder/CEO, AgentMail (YC S25; $6M seed led by General Catalyst, Mar 2026)
- Company: AgentMail — "the first email provider built for AI agents": dedicated inboxes agents can create via an onboarding API (agents sign up themselves), full two-way threads/labels/search/reply via API, 100M+ emails delivered, 500+ B2B customers; viral growth after OpenClaw burst (3x users in a week, 4x the next month in early 2026). Aujla's framing: "The next billion users of the internet will be AI agents. We're building infrastructure that treats agents as first-class citizens, starting with email." Ex-Optiver quant; co-founders from Michigan (Nvidia, Accel).
- Sources: https://techcrunch.com/2026/03/10/agentmail-raises-6m-to-build-an-email-service-for-ai-agents/ ; https://pulse2.com/agentmail-6-million-raised-for-email-provider-built-for-ai-agents/ ; https://startupfortune.com/giving-your-ai-agent-an-email-address-is-now-a-real-product-category/
- Impress: an agent with its *own email identity* that waits for replies, parses verification codes/threads, and collaborates with humans over email.

### 9. Erik Thorelli — Head of DX, CodeRabbit
- Company: CodeRabbit — AI code review (context-aware PR reviews, 2M+ reviews/week per company claims), free for public GitHub repos (approaching 100k OSS projects), launched a Slack agent for engineering teams (context/memory across repos, tickets, docs, alerts). He judges **Best Open Source** side quest ($10k CodeRabbit credits). On open source (We Love Open Source podcast, Apr 2026): AI augments rather than replaces developers; CodeRabbit pledged $1M in cash sponsorships to OSS maintainers in 2026 ("cash matters more than free tools"). Talk at AI Dev 26 SF: deploying AI code review at scale — context-rich review systems, isolated verification workflows, feedback loops.
- Sources: https://allthingsopen.org/articles/open-source-maintainers-cash-ai-code-review ; https://www.archyworldys.com/coderabbit-launches-ai-slack-agent-for-engineering-teams/ ; https://clipzag.com/watch?v=zbuf9J5KgOM (AI Dev 26 talk listing)
- Impress: ship the hack project as **public open source** with a good README — this directly competes for his side quest.

### 10. Jakub Krehel — Founding Design Engineer, Interfere (ex-OpenSea)
- Company: Interfere — "the self-healing layer of the internet" (incident-response platform where agents and humans collaborate; redesigned problem timelines distinguishing agent findings vs. human actions). Jakub writes the craft canon at https://jakub.kr: concentric border radii, optical alignment, OKLCH color, shadows-as-borders, staggered enter animations, shared layout transitions, subtle motion ("The best animation is that which goes unnoticed"; "Is this subtle and polished enough for production?"). His writings are literally distilled into design-engineer skills (OpenClaw "interface-feel" skill). He's on X @jakubkrehel.
- Sources: https://jakub.kr ; https://github.com/shogun101/interface-feel ; https://github.com/interfere-inc/docs/blob/HEAD/sources/site/interfere.com/changelog.md
- Impress: production-grade UI polish — invisible-feeling animations, OKLCH palettes, attention to details most hackers skip. The craft judge.

### 11. James da Costa — Partner, a16z (AI Apps fund)
- Focus: B2B software + financial services; co-founder of YC-backed digital bank Fingo (Kenya, ~200k users); ex-McKinsey; Stanford MBA; researcher at Stanford's Human-Centered AI Institute (economic implications of AI); author of *Fintech Wars* (2024 Sunday Times bestseller); Forbes 30 Under 30, MIT Innovator Under 35. a16z led Exa's $250M round — he's likely the Exa-linked partner. a16z Academy (announced ~Sept 2026) emphasizes "proof of work" and "slope, not experience."
- Sources: http://a16z.com/author/james-da-costa/ ; https://review.brunswickgroup.com/article/fintech-insider-a16z/
- Impress: a product that could *be a company* — real users, real utility, commercial instinct (fintech/B2B agent workflows are his sweet spot).

---

## "How to impress this panel" synthesis

1. **Live working demo, not slides.** Format: finalist demos + judging, then awards same day. Judges nominate side quests *during* judging.
2. **Use the co-host stack meaningfully** (Neon Postgres/AI Gateway + Fly Sprites + Mastra + Exa + Kernel browsers + Executor MCP + assistant-ui + AgentMail). A coherent pipeline — e.g., agent on Sprites (Johnston) with Postgres memory (Shamgunov), Exa web research (Wang), Kernel browser actions (Jue), Executor tool catalog (Sullivan), assistant-ui chat (Farshid), AgentMail identity (Aujla) — touches every judge's worldview.
3. **Design craft is disproportionately rewarded.** Two dedicated side quests (Best UI $750, judged by the assistant-ui founder; Best Open Source $10k, judged by CodeRabbit's DX head) plus a founding design engineer on the panel (Krehel). Polished UI + public repo = two extra shots at winning.
4. **Practical personal utility.** The brief: "helps you or your team with something in your personal life" — inbox management, smart home, day-to-day decisions. Agents that *do things* (Kernel browser use, email follow-through, real transactions) over chatbots.
5. **Memory + persistence.** A recurring theme: Mastra's Observational Memory, Databricks' Genie Ontology/context layer, Fly's stateful compute — agents that remember across sessions.
6. **Governance/safety signals.** Mastra+OpenBox (one-line governance), Kernel (permission scopes, credential safety), Executor (per-tool approval policies) — show human-in-the-loop approvals where the agent spends money or touches credentials.
7. **Make it a real product.** The a16z partner rewards founder-level ambition: real users, a monetizable wedge, proof of work.

## Could not verify / open questions

1. **No prior editions confirmed** — if organizers ran a private/test event under another name, no public record exists. Answer (2)–(4) of the mission are therefore N/A.
2. **No submissions platform page found** — Luma says "Hack platform now open: build-personal-agents.com" but no public gallery of submissions exists yet; winners (and any public write-ups) will only appear after today's event.
3. **Individual judge X/Twitter post histories** were not scraped (no sign-in, limited budget); dossiers rely on company announcements, interviews, talks, and official bios. No contradictions found across sources.
4. CodeRabbit's prize listing: the site and Luma agree on $10k CodeRabbit usage credits for Best Open Source.

## Sources (index vs live)
- build-personal-agents.com — **verified live** (Oct 4, 2026, browser_open)
- Luma https://luma.com/build-agents — index (crawled ~3h before research)
- Per-judge sources listed inline above (URLs verbatim; all index-sourced).
