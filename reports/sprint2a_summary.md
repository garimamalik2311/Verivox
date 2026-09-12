# Sprint 2a — Model Selection Summary

## Data (post split-fix by Avika)
- Train: 5052 windows, 50/50 real/fake, speaker-disjoint
- Val:   1127 windows, 49/51 real/fake, speaker-disjoint
- Test:  1013 windows, 50/50 real/fake, speaker-disjoint (never seen during training)

## Baseline XGBoost (default hyperparameters)
- Val  ROC-AUC: 0.9241
- Test ROC-AUC: 0.9085
- Test classification (threshold 0.5):
  - Real (0): P=0.8144, R=0.8127, F1=0.8136
  - Fake (1): P=0.8164, R=0.8180, F1=0.8172
- Fit time: ~2.4s

## Tuned XGBoost (grid search, 1215 fits)
- Best params: colsample_bytree=0.9, lr=0.1, max_depth=4, n_estimators=500, subsample=0.9
- Val  ROC-AUC: 0.9332
- Test ROC-AUC: 0.9118
- Fit time: ~3.5s

## Verdict
**Ship the baseline.** Tuning improved val by 0.9 AUC points but test by only 0.3 —
not meaningful. The val-test gap on the tuned model (0.021) suggests mild selection
bias from grid search. Baseline is simpler and equivalent.

## Model comparison (val)
| Model | Accuracy | F1 | ROC-AUC | Fit time |
|-------|----------|-----|---------|----------|
| XGBoost            | 0.8412 | 0.8434 | 0.9241 | 3.5s |
| RandomForest       | 0.7977 | 0.7968 | 0.8899 | 2.4s |
| LogisticRegression | 0.7604 | 0.7615 | 0.8576 | 0.4s |
| KNN                | 0.7258 | 0.7366 | 0.8103 | 0.0s |

XGBoost beats next-best by 3.4 AUC points — clear winner.

## Improvement vs pre-split-fix run
| Metric | Pre-fix (skewed) | Post-fix (honest) |
|--------|-----------------|-------------------|
| Fake-class precision | 0.4979 | 0.8164 |
| Overall accuracy | 0.7519 | 0.8154 |
| Test set size | 100 (mini) | 1013 |

## Artifacts
- reports/xgboost_tuned.joblib
- reports/xgboost_best_params.json
- reports/model_comparison.csv
- reports/test_probs.npy (tuned model probabilities on test)
- reports/test_probs_baseline.npy (baseline probabilities on test)
- reports/test_labels.npy (ground truth)
- reports/eda_feature_distributions.png