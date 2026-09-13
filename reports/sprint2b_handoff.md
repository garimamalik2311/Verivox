# Sprint 2b Handoff — Trained Model

## Which model to use
**Ship the BASELINE XGBoost** (`reports/xgboost_baseline.joblib`).

Tuning gave no meaningful test improvement:
- Baseline test ROC-AUC: 0.9085
- Tuned test ROC-AUC:    0.9118
- Difference:            +0.0033 (within noise)

The tuned model improved val by 0.0091 but test by only 0.0033, which suggests
mild selection bias from grid search. The baseline is simpler, faster, and
statistically equivalent on the honest holdout.

**Both models' test predictions are saved so you can calibrate against whichever
performs better under your method:**
- `reports/test_probs.npy` — tuned model's `ai_probability` on test set
- `reports/test_probs_baseline.npy` — baseline model's `ai_probability` on test set
- `reports/test_labels.npy` — ground-truth labels (0 = real, 1 = fake)

## Files
- `reports/xgboost_baseline.joblib` — trained XGBClassifier (baseline params) ← **use this**
- `reports/xgboost_tuned.joblib` — trained XGBClassifier (tuned params)
- `reports/xgboost_best_params.json` — tuned hyperparameters
- `reports/model_comparison.csv` — XGBoost vs RF vs LogReg vs KNN
- `reports/test_probs.npy`, `reports/test_probs_baseline.npy`, `reports/test_labels.npy`

## Loading
```python
import joblib, numpy as np

# Load the baseline model (recommended for shipping)
model = joblib.load("reports/xgboost_baseline.joblib")

# Or the tuned model
# model = joblib.load("reports/xgboost_tuned.joblib")
```

## Inference
```python
# X_window is a single 30-dim feature vector, shape (30,)
probs = model.predict_proba(X_window.reshape(1, -1))
ai_probability = float(probs[0, 1])
```

**Warning:** `ai_probability` here is the **raw, uncalibrated** classifier output.
It's a ranking score, not a true likelihood. Sprint 2b's calibration step
transforms it into a trustworthy probability — do not consume the raw value
directly in the risk engine.

## Interface contract (final, v1.0)
Each prediction maps to a JSON object:

```json
{
  "schema_version": "1.0",
  "stream_id": "...",
  "window_id": 12345,
  "timestamp": 1234567890.123,
  "speech_detected": true,
  "ai_probability": 0.87,
  "model_version": "sprint2a-xgb-v1"
}
```

**Field notes:**
- `schema_version` — contract version. Bumps only on breaking changes.
- `speech_detected` — always `true` for a ModelPrediction (VAD runs upstream; the
  model only scores speech-passed windows). Absence of a prediction means "no speech
  in this window" — the risk engine should NOT infer a 0.0 probability for gaps.
- `ai_probability` — output of `predict_proba(...)[:, 1]`. Class 1 = fake/AI;
  class 0 = real/bonafide.
- `model_version` — see versioning below.

**Model versioning:**
- `sprint2a-xgb-v1` — raw, uncalibrated output (current)
- `sprint2a-xgb-v1-calibrated` — to be used once Sprint 2b ships the calibrated model

The rolling risk aggregation layer is yours.

## Model facts (updated)
- **Test ROC-AUC:** 0.9085 (baseline) / 0.9118 (tuned) — the honest holdout number
- **Val ROC-AUC:**  0.9241 (baseline) / 0.9332 (tuned)
- **Test precision, fake class:** 0.8164 (baseline) / 0.8228 (tuned)
- **Test precision, real class:** 0.8144 (baseline) / 0.8158 (tuned)
- **Test accuracy:** 0.8154 (baseline) / 0.8193 (tuned)
- **Symmetric:** no bias toward either class — this was NOT true before the split fix

## Improvement vs pre-split-fix
The data owner (Avika) regenerated the split with stratified, speaker-disjoint
train/val/test. This eliminated a speaker-leakage problem that was inflating
metrics and a class imbalance that was destroying fake-class precision.

| Metric | Pre-fix (skewed) | Post-fix (honest) |
|--------|-----------------|-------------------|
| Val fake-class precision | 0.4979 | 0.8427 |
| Val fake-class recall    | 0.9328 | 0.8441 |
| Val accuracy             | 0.7519 | 0.8412 |
| Test set size            | 100 (mini) | 1013 |
| Test set AUC             | N/A | 0.9085 (baseline) |

The old 0.9357 val AUC was inflated by speaker leakage; 0.9085 is the honest
speaker-disjoint test number.

## Calibration note
Raw probabilities at threshold 0.5 give ~0.82 precision on both classes.
XGBoost's raw sigmoid outputs are not well-calibrated by default. For
threshold-based alerting, apply Platt scaling or isotonic regression before
wiring into the risk aggregation layer. See
`sklearn.calibration.CalibratedClassifierCV`.

Use `test_probs.npy` + `test_labels.npy` (or the baseline variants) to measure
calibration quality on the held-out test set — the model has never seen these
1013 windows, so the number you measure is honest.

## Recommended thresholds for risk engine
At threshold 0.5: precision ~0.82, recall ~0.82.
For higher-precision alerting (fewer false positives), raise threshold to
~0.7 — expect precision ~0.90 but recall drops to ~0.60.

Do NOT use the old defaults (0.50/0.70/0.80 with 4 consecutive flags) without
calibrating first — they were tuned against engineering intuition, not this
model. Recommend threshold calibration based on the precision-recall curve
from `test_probs.npy` + `test_labels.npy`.

## Feature order
The 30-dim vector is [13 MFCC | 5 spectral | 12 chroma] in the order produced
by `src/process_dataset.py`. Do NOT reorder — the model was trained on that
exact ordering and silently produces garbage on reordered inputs.

## Known issues
- `test_mini.npy` (100 windows) is kept for smoke tests only — do not use for
  calibration or final metrics.
- The tuned model's val-test gap (0.021 AUC) suggests it overfit val slightly.
  That's why we recommend shipping the baseline.
- If Avika regenerates the split again, re-train and re-handoff — the model
  artifact is coupled to the specific train/val/test partition.

## Artifacts
- `reports/xgboost_baseline.joblib` — **baseline model (ship this)**
- `reports/xgboost_tuned.joblib` — tuned model (kept for reference)
- `reports/xgboost_best_params.json`
- `reports/model_comparison.csv`
- `reports/test_probs.npy` (tuned)
- `reports/test_probs_baseline.npy` (baseline)
- `reports/test_labels.npy`
- `reports/eda_feature_distributions.png`
- `reports/sprint2a_summary.md` — full narrative