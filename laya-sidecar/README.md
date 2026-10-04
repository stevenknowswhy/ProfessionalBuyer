# Laya sidecar

Not used. Receipt triage is Jev, model `typesafe/jev-1.13`, via
`POST https://openrouter.ai/api/alpha/decisions` and `OPENROUTER_API_KEY`
(`integrations/src/triage.ts`). Do not start this process for the demo.
`typesafe/jev-router` is a different product and is not the triage model.

The notes below describe the old local sidecar, kept so the question wording
stays next to the code that used to call it.

## Run

```bash
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8787
```

First load downloads the weights (~808MB English checkpoint) and takes ~30s;
subsequent starts use the Hugging Face cache. Set `HF_HUB_OFFLINE=1` to force
cache-only loading.

## API

- `GET /health` → `{"ok": true, ...}`
- `POST /predict` with `{"state": ..., "questions": {...}}` → Laya's answers,
  each with probabilities and confidence. See `questions.py` for the Buyer's
  ready-made sets (`TRIAGE_QUESTIONS`, `BUY_GUARD_QUESTIONS`, `SIGNIFICANCE_QUESTIONS`).

## Notes

- One agent is loaded at startup and shared; calls are serialized with a lock
  (one forward pass at a time per device).
- Integration guide: `.claude/skills/laya-integration/SKILL.md`.
