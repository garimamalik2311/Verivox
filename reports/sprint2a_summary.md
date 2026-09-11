# Sprint 2a — Model Selection Summary

## Data
- 600 clips, 4 balanced quadrants (en/hi × real/fake), 150 each
- X_train (5737, 30), y_train (5737,)
- X_val (1455, 30), y_val (1455,)
- No dead features, no highly correlated pairs

## Baseline XGBoost
- Val ROC-AUC: 0.9357
- Fit time: 1.15s
- Real (0):  P=0.9694  R=0.6931  F1=0.8083
- Fake (1):  P=0.4979  R=0.9328  F1=0.6485

## Tuned XGBoost
- Best params: colsample_bytree=1.0, lr=0.1, max_depth=4, n_estimators=500, subsample=0.8
- CV ROC-AUC: 0.8816 (5-fold)
- Val ROC-AUC: 0.9366 — statistically identical to baseline
- Conclusion: default hyperparameters were near-optimal; tuning yielded no meaningful gain

## Model comparison (val)
| Model | Acc | F1 | ROC-AUC | Fit time |
|-------|-----|-----|---------|----------|
| XGBoost | 0.7519 | 0.6485 | 0.9357 | 10.2s |
| RandomForest | 0.6612 | 0.5640 | 0.8894 | 3.1s |
| KNN | 0.6309 | 0.5484 | 0.8789 | 0.02s |
| LogisticRegression | 0.6687 | 0.5610 | 0.8632 | 0.33s |

## Open issues
- Train/val split is unstratified (train 43/57, val 75/25); fake-class precision suffers (49.8%)
- test_mini is only 100 windows — too small for Sprint 2b calibration
- Need to verify speaker-disjoint split
- Missing OS dep: ffmpeg (required by torchcodec)
- Missing pip dep: matplotlib

## Artifacts
- reports/xgboost_tuned.joblib
- reports/xgboost_best_params.json
- reports/model_comparison.csv
- reports/eda_feature_distributions.png
