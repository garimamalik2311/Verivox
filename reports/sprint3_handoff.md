# Sprint 2b Handoff — Calibrated Model & /predict API

## What you're inheriting
A working, calibrated XGBoost model exposed via a live `/predict` endpoint,
ready to plug into the WebSocket server (Sprint 3a) and risk engine
(Sprint 3b).

## Files
- `reports/xgboost_calibrated.joblib` — the model to use (NOT xgboost_baseline
  or xgboost_tuned — those are uncalibrated)
- `src/api/predict.py` — the FastAPI `/predict` endpoint
- `reports/probs_real_test.npy`, `reports/probs_fake_test.npy` — calibrated
  probability distributions for threshold tuning
- `reports/precision_recall_curve.png`, `reports/calibration_curve.png` —
  supporting plots
- `reports/sprint2b_summary.md` — full narrative and methodology

## Running the API
```bash
uvicorn src.api.predict:app --reload --port 8000
```
Test at `http://127.0.0.1:8000/docs`.

## Interface contract (final, confirmed with the team)
Request:
```json
{
  "stream_id": "call_001",
  "window_id": 42,
  "timestamp": 1234567890.123,
  "features": [30 floats]
}
```
Response:
```json
{
  "schema_version": "1.0",
  "stream_id": "call_001",
  "window_id": 42,
  "timestamp": 1234567890.123,
  "speech_detected": true,
  "ai_probability": 0.87,
  "model_version": "sprint2a-xgb-v1-calibrated"
}
```

## Guardrails already built in
- Rejects requests where `features` length != 30 (HTTP 400)
- Rejects requests containing NaN values (HTTP 400)
- Logs every prediction (stream_id, window_id, ai_probability)

## Recommended threshold (for Sprint 3b / Avika)
**0.717** → precision=0.90, recall=0.70 on the fake class. Above this,
you get high confidence but miss ~30% of fakes; below it, you catch more
but with more false positives. Tune based on your risk tolerance —
raw distributions are in `probs_real_test.npy` / `probs_fake_test.npy`
if you want to pick a different point on the curve.

## Latency (single-window inference)
p50: 3.49 ms | p95: 14.65 ms | p99: 18.49 ms — well within real-time
budget alongside Sprint 1's VAD (2.96 ms).

## Known limitations
- Real/fake probability distributions have tail overlap (some real samples
  score up to 0.84, some fakes as low as 0.12) — recall caps around 0.70
  at the 0.90-precision threshold. This is a property of the data, not
  a bug to fix in the risk engine.
- Calibration used sigmoid (Platt scaling), not isotonic, due to a small
  calibration sample size (~563). If more validation data becomes
  available later, isotonic is worth revisiting.

## What NOT to do
- Don't retrain or re-tune the model — Sprint 2a and 2b are both frozen.
- Don't use `xgboost_baseline.joblib` or `xgboost_tuned.joblib` directly —
  they're uncalibrated. Always use `xgboost_calibrated.joblib` (or hit
  `/predict`, which already applies calibration).
- Don't reorder the 30-dim feature vector: [13 MFCC | 5 spectral | 12 chroma].