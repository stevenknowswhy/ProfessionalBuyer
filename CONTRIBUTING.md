# Contributing to Personal Professional Buyer

Thanks for your interest! This project was started at the Build Personal Agents Hack
(SF, Oct 4 2026) and is open to contributors.

## Ground rules

- **Every PR is reviewed by CodeRabbit** (AI code review, free for this public repo).
  Keep PRs small and focused so reviews stay useful.
- **Demo honesty:** all numbers the demo shows must be reproducible. If your PR changes a
  computed value (savings, landed cost, confidence), document how it's derived.

## Dev setup

> Skeleton — the team fills in exact commands as code lands today.

Prerequisites:

- Node 20+ and pnpm, **or** Python 3.12 and pip _(TODO(team): lock one)_
- Docker + Docker Compose (local services)
- API keys — copy `.env.example` to `.env` and fill in:
  `EXA_API_KEY`, `KERNEL_API_KEY`, `AGENTMAIL_API_KEY`, `NEON_DATABASE_URL`, …

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
├── agent/            # Mastra agent: tools, workflows, Observational Memory (TODO)
├── laya-sidecar/     # Local Laya decision service (FastAPI on 127.0.0.1) (TODO)
├── web/              # assistant-ui chat + savings dashboard (TODO)
├── seed/             # Fixture receipts for the demo (TODO)
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
