# Laya sidecar

Local decision service for the Personal Professional Buyer. Laya is a small
(~400M param) open-source model that answers typed yes/no/choice questions about
text in ~30ms with no LLM call and no data leaving the machine. It sits in front
of the agent as a cheap "System 1": triage, guardrails, significance scoring.
Anything below the confidence threshold cascades to the LLM or human approval.

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
