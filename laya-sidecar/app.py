"""Professional Buyer — Laya decision sidecar.

Local, fast (~30ms) typed decisions in front of the agent's LLM:
receipt triage, buy guardrails, price-drop significance. Anything below the
confidence threshold cascades to the LLM or human approval.

Run:
    pip install -r requirements.txt
    uvicorn app:app --host 127.0.0.1 --port 8787

The agent calls POST /predict with {"state": ..., "questions": {...}}.
Ready-made Buyer question sets live in questions.py.
"""

import threading

import laya
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any

app = FastAPI(title="Professional Buyer — Laya sidecar")
_lock = threading.Lock()
_agent = laya.load("convaiinnovations/laya")  # English checkpoint


class PredictBody(BaseModel):
    state: Any
    questions: dict


@app.on_event("startup")
def _warmup() -> None:
    # First call compiles kernels; do it once here, not in the demo path.
    with _lock:
        _agent.predict(
            "warmup",
            {"q": {"type": "noul", "instructions": "Is this a warmup call?"}},
        )


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": "convaiinnovations/laya"}


@app.post("/predict")
def predict(body: PredictBody) -> dict:
    # One GPU serves one forward pass at a time — serialize calls.
    with _lock:
        return _agent.predict(body.state, body.questions)
