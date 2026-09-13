# Sprint 2b — Evaluation, Calibration & /predict API

## Model shipped
`reports/xgboost_baseline.joblib` (baseline XGBoost), per Sprint 2a's
recommendation — tuning gave no meaningful improvement over defaults
(test AUC 0.9118 tuned vs 0.9085 baseline, within noise).

## Test-set metrics (1013 windows, speaker-disjoint holdout)
- **Test ROC-AUC: 0.9085** (matches Sprint 2a's reported number exactly)
- Real (0): Precision=0.81, Recall=0.81, F1=0.81
- Fake (1): Precision=0.82, Recall=0.82, F1=0.82
- Overall accuracy: 0.82

## Precision-recall analysis
At **threshold 0.717**: precision=0.901, recall=0.695 on the fake class.
This is the recommended alerting threshold for high-confidence detection —
matches Sprint 2a handoff's guidance (~0.7 threshold → ~0.90 precision).
See `reports/precision_recall_curve.png`.

## Calibration
Both sigmoid (Platt scaling) and isotonic regression were tried:
- Sigmoid: Brier=0.1231
- Isotonic: Brier=0.1217 (marginally better)

**Sigmoid was chosen** despite the marginally higher Brier score. Isotonic's
calibration curve showed visible instability (non-monotonic jumps) due to
the small calibration set (~563 samples, below isotonic's recommended
~1000+ per the Sprint 2a handoff's own guidance). Sigmoid produced a
smooth, defensible curve tracking the diagonal closely. See
`reports/calibration_curve.png`.

Calibrated model saved to `reports/xgboost_calibrated.joblib`.

## Probability distributions (for risk engine / Avika)
Calibrated test-set probabilities:
- REAL samples: 5th/50th/95th percentile = 0.054 / 0.104 / 0.836
- FAKE samples: 5th/50th/95th percentile = 0.124 / 0.905 / 0.946

Medians separate cleanly, but there is real tail overlap — some real
samples score as high as 0.84, some fake samples as low as 0.12. This
explains why recall tops out around 0.70 at the high-precision threshold.
Saved: `reports/probs_real_test.npy`, `reports/probs_fake_test.npy`.

## Latency benchmark (1000 single-window predictions)
- p50: 3.49 ms
- p95: 14.65 ms
- p99: 18.49 ms
- mean: 4.85 ms

Comfortably under the real-time constraint (Sprint 1's VAD stage measured
2.96 ms for comparison; anything under ~100ms is acceptable per spec).

## Interface contract (confirmed final, no more drift)
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
Implemented in `src/api/predict.py` as `POST /predict`. Verified via
Swagger UI and curl.

## Edge case behavior
| Input | Result |
|---|---|
| All-zero features | 200 OK, ai_probability=0.054 (reads as real) |
| Very large values (1e6) | 200 OK, ai_probability=0.566 (near-uncertain, does not falsely over-commit) |
| All-NaN features | 400 rejected — "Features contain NaN values" |
| Wrong feature count | 400 rejected — "Expected 30 features, got N" |

See `tests/test_predict_edge_cases.py`.

## Known limitations
- Isotonic calibration was rejected for instability at this sample size —
  worth revisiting if a larger validation set becomes available.
- Fake-class recall caps around 0.70 at the high-precision (0.90) threshold
  due to genuine distribution overlap in the tails — not a bug, a property
  of the data.
- The original pre-split-fix run had a severe unstratified train/val split
  (43/57 real/fake) that inflated fake-class precision to an unreliable
  0.4979. This was fixed upstream by Avika (Sprint 1) with a proper
  stratified, speaker-disjoint split before this evaluation was run.
- Latency was benchmarked on real validation feature vectors, single-window,
  single-threaded — concurrent-stream load testing is a stretch goal per
  the original spec, not covered here.

## Deliverables checklist
- [x] `reports/sprint2b_summary.md` (this file)
- [x] `reports/xgboost_calibrated.joblib`
- [x] `reports/calibration_curve.png`
- [x] `reports/precision_recall_curve.png`
- [x] `reports/probs_real_test.npy`, `reports/probs_fake_test.npy`
- [x] `reports/latency_benchmark.txt`
- [x] `src/api/predict.py` (FastAPI endpoint)
- [x] `tests/test_predict_edge_cases.py`
- [x] Message sent to Avika with recommended thresholds