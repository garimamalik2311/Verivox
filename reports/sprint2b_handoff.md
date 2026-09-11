# Sprint 2b Handoff — Trained Model

## Files
- `reports/xgboost_tuned.joblib` — the trained XGBClassifier
- `reports/xgboost_best_params.json` — hyperparameters
- `reports/model_comparison.csv` — full comparison table

## Loading
```python
import joblib, numpy as np
model = joblib.load("reports/xgboost_tuned.joblib")
```

## Inference
```python
# X_window is a single 30-dim feature vector
probs = model.predict_proba(X_window.reshape(1, -1))
ai_probability = float(probs[0, 1])
```

## Interface contract (per spec)
Each prediction maps to a JSON object:

```json
{
  "stream_id": "...",
  "window_id": 12345,
  "timestamp": 1234567890.123,
  "speech_detected": true,
  "ai_probability": 0.87,
  "model_version": "sprint2a-xgb-v1"
}
```

`ai_probability` is the output of `predict_proba(...)[:, 1]`.
The rolling risk aggregation layer is yours.

## Model facts
- Val ROC-AUC: 0.9366 (tuned) / 0.9357 (baseline)
- Val precision (fake class): 0.51 — poorly calibrated at threshold 0.5
- The model over-flags fake: 93% recall on fake but only 51% precision

## Calibration note
XGBoost's raw sigmoid outputs are not well-calibrated. For threshold-based
alerting, apply Platt scaling or isotonic regression on the validation set
before wiring into the risk aggregation layer. See `sklearn.calibration.CalibratedClassifierCV`.

## Known issues
- Train/val split is unstratified (train 43/57 real/fake, val 75/25) — flagged
  to the data owner. If regenerated, re-train and re-handoff.
- `test_mini` is only 100 windows — not a reliable eval set.

## Feature order
The 30-dim vector is [13 MFCC | 5 spectral | 12 chroma] in the order produced
by `src/process_dataset.py`. Do NOT reorder.