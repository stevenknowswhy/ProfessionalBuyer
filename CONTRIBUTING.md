# Contributing to Personal Professional Buyer

Thanks for your interest! This project was started at the Build Personal Agents Hack
(SF, Oct 4 2026) and is open to contributors.

## Ground rules

- **Every PR is reviewed by CodeRabbit** (AI code review, free for this public repo).
  Until the repo has 10 stars, CodeRabbit does not review automatically: a person (not a bot
  account) comments `@coderabbitai full review` on the PR, or ticks **Trigger review** in
  CodeRabbit's status comment.
  Keep PRs small and focused so reviews stay useful.
- **Demo honesty:** all numbers the demo shows must be reproducible. If your PR changes a
  computed value (savings, landed cost, confidence), document how it's derived.

## Dev setup

> Skeleton — the team fills in exact commands as code lands today.

Prerequisites:

- Node 22+ and pnpm (the product is TypeScript)
- Python 3.12 and pip, only for `laya-sidecar/`
- API keys — copy `.env.example` to `.env` and fill in the variables listed in
  [techStack.md](techStack.md#environment-variables)

```bash
git clone https://github.com/stevenknowswhy/ProfessionalBuyer.git
cd ProfessionalBuyer
cp .env.example .env   # fill in keys (see above)
# TODO(team): install — e.g. pnpm install  |  pip install -r requirements.txt
# TODO(team): seed fixture receipts — e.g. pnpm seed  |  ./seed.sh
# TODO(team): run dev — e.g. pnpm dev  |  uvicorn app:app --reload
```

## Project layout (target)

```text
.
├── agent/            # Mastra server: tools, workflows, memory, landed-cost code (TODO)
├── web/              # Next.js: assistant-ui chat, savings dashboard, trace panel (TODO)
├── worker/           # Price watches + daily briefing; runs locally or on a Fly Sprite (TODO)
├── laya-sidecar/     # Local Laya decision service (FastAPI on 127.0.0.1)
├── db/schema.sql     # Plain SQL schema for Neon (TODO)
├── seed/             # Fixture receipts for the demo
├── PLAN.md           # Build plan, schedule, risks
├── techStack.md      # Sponsor-by-sponsor use cases and wiring
├── .claude/skills/   # Versioned agent skills (laya-integration)
└── research/         # Hackathon strategy docs (judges, matrix, MVP)
```

## Pull requests

1. Branch from `main`: `feat/<short-name>` (e.g. `feat/exa-price-scan`).
2. One slice per PR — small diffs get better CodeRabbit reviews.
3. Tests must pass _(TODO(team): wire up `pnpm test` / `pytest`)_.
4. Address CodeRabbit's comments, or reply explaining why not.
5. If your change alters setup, update the README quickstart in the same PR.

## Commit style

Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `demo:`.

## Code of conduct

Be kind. This is a hackathon-born project: review vigorously, merge generously.
