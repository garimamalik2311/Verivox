"""
Sprint 2b - Step 6: /predict API endpoint.

Loads the calibrated baseline model and exposes it as a REST endpoint
matching the team's finalized JSON contract (see reports/sprint2b_handoff.md).
"""

import math
import logging
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verivox.predict")

app = FastAPI(title="VeriVox /predict")

# Load once at startup, not per-request
model = joblib.load("reports/xgboost_calibrated.joblib")

FEATURE_LENGTH = 30
MODEL_VERSION = "sprint2a-xgb-v1-calibrated"


class WindowRequest(BaseModel):
    stream_id: str
    window_id: int
    timestamp: float
    features: list[float]


@app.post("/predict")
def predict(req: WindowRequest):
    # Guardrail 1: correct feature length
    if len(req.features) != FEATURE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {FEATURE_LENGTH} features, got {len(req.features)}",
        )

    # Guardrail 2: no NaN values
    if any(math.isnan(f) for f in req.features):
        raise HTTPException(status_code=400, detail="Features contain NaN values")

    X = np.array(req.features, dtype=np.float32).reshape(1, -1)
    ai_probability = float(model.predict_proba(X)[0, 1])

    logger.info(
        "prediction stream_id=%s window_id=%s ai_probability=%.4f",
        req.stream_id, req.window_id, ai_probability,
    )

    return {
        "schema_version": "1.0",
        "stream_id": req.stream_id,
        "window_id": req.window_id,
        "timestamp": req.timestamp,
        "speech_detected": True,
        "ai_probability": ai_probability,
        "model_version": MODEL_VERSION,
    }