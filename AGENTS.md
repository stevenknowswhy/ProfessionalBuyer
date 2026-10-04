# AGENTS.md

Instructions for every coding agent working in this repo (Cursor cloud agents, Claude Code, CodeRabbit reviews).

## The situation

Hackathon build, Sun Oct 4, 2026. Feature freeze **4:00 PM PT**, submit by 4:15, submissions close 4:30. One human owner, several parallel agents. Working beats clever; small PRs beat big ones.

## Which agent are you?

Your kickoff prompt says. Read your plan first, then [CONTRACT.md](CONTRACT.md):

| Agent | Plan | You may edit |
|---|---|---|
| Frontend | [PLAN-frontend.md](PLAN-frontend.md) | `web/` |
| Backend-core | [PLAN-backend.md](PLAN-backend.md) | `agent/`, `db/`, `seed/`, `.env.example`, `scripts/`, `.coderabbit.yaml` |
| Integrations | [PLAN-integrations.md](PLAN-integrations.md) | `integrations/`, `worker/`, `laya-sidecar/` |
| Release (from 2:45) | [PLAN-release.md](PLAN-release.md) | `README.md`, `techStack.md`, `docs/` |

Everyone may make **additive** changes to `contract/` following [CONTRACT.md](CONTRACT.md#changing-the-contract). Nobody edits another agent's directories, `PLAN*.md`, `CONTRACT.md` or `DECISIONS.md`; propose changes in your PR description.

## Hard rules

- **Money:** every dollar figure comes from `contract/src/landed-cost.ts`. Never type a number into UI or copy. Money is integer cents.
- **No purchases.** The app never checks out and never calls Kernel. An offer is a price plus a URL. The UI shows that link.
- **Demo data is the sample fixtures** in `contract/fixtures`, labeled Sample data. Do not block on live Exa.
- **Receipt triage is Jev**, model `typesafe/jev-1.13`, `POST https://openrouter.ai/api/alpha/decisions`, using `OPENROUTER_API_KEY`. Not Laya, and not `typesafe/jev-router`.
- **Chat LLM** is OpenAI `gpt-4o-mini` (`OPENAI_API_KEY`), with OpenRouter `openrouter/free` as the fallback.
- **Honesty:** every external call has a fallback, and every fallback is labeled (`provenance`, `usingFallback`). Never show cached or sample data as live.
- **Secrets:** names and sources are in [KEYS.md](KEYS.md) and [`.env.example`](.env.example). Never commit `.env` or keys. If a key is missing, use the fallback and say so in the PR description; do not stop.
- **Lockfile:** on a `pnpm-lock.yaml` conflict, take `main`'s version, run `pnpm install`, commit. Never hand-merge it.
- **Versions:** install `ai`, `@ai-sdk/*`, `@assistant-ui/*`, `@mastra/*` at `@latest` together. Mastra `chatRoute` must use `version: 'v7'`. Do not copy code from examples written for `ai@5` or `ai@6`.

## Commands

```bash
pnpm install
pnpm contract:check        # contract typecheck + landed-cost and fixture tests; must pass before any PR touching contract/
pnpm --filter @buyer/contract fixtures   # regenerate sample fixtures after a contract change
psql "$DATABASE_URL_UNPOOLED" -f db/schema.sql   # idempotent
```

Node 22+, pnpm 10. Python only in `laya-sidecar/`.

## Skills and docs

Vendored skills are in `.claude/skills/` (index: `.claude/skills/SOURCES.md`). Your plan names the ones to read before coding. Docs MCP servers for Mastra, assistant-ui and shadcn are in `.cursor/mcp.json`. Verified vendor constraints are in [techStack.md](techStack.md#verified-constraints-checked-oct-4-1215-pm).

## Pull requests

- Branch names are given in your plan. Open a PR at every gate; do not let a branch sit unmerged for more than 45 minutes.
- PR description: what works now (with evidence such as a curl output or screenshot), what is stubbed or a fallback, which keys are missing, and anything you need from the human or another agent.
- The human triggers CodeRabbit with `@coderabbitai full review`. Address real findings or reply with the reason.
