"""
Quick check: does the untuned baseline beat the tuned model on the test holdout?

Loads pre-generated data, fits only the baseline XGBoost, evaluates on test,
and compares against the already-saved tuned model's test predictions.
Runs in ~10 seconds — no grid search.
"""

import numpy as np
import joblib
from pathlib import Path
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, roc_auc_score

PROCESSED = Path("data/processed")
REPORTS = Path("reports")

# ---- Load data ----
X_train = np.load(PROCESSED / "X_train.npy")
y_train = np.load(PROCESSED / "y_train.npy")
X_test  = np.load(PROCESSED / "X_test.npy")
y_test  = np.load(PROCESSED / "y_test.npy")

# ---- Fit baseline (same hyperparams as train_model.py) ----
print("Fitting baseline XGBoost...")
baseline = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.9,
    colsample_bytree=0.9,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1,
    tree_method="hist",
)
baseline.fit(X_train, y_train)

# ---- Evaluate baseline on test ----
probs_baseline = baseline.predict_proba(X_test)[:, 1]
auc_baseline = roc_auc_score(y_test, probs_baseline)

print("\n" + "=" * 70)
print("BASELINE MODEL ON TEST HOLDOUT")
print("=" * 70)
print(classification_report(y_test, baseline.predict(X_test), digits=4))
print(f"Baseline Test ROC-AUC: {auc_baseline:.4f}")

# ---- Load tuned model's test predictions (already saved) ----
probs_tuned = np.load(REPORTS / "test_probs.npy")
auc_tuned = roc_auc_score(y_test, probs_tuned)

print("\n" + "=" * 70)
print("BASELINE VS TUNED (TEST HOLDOUT)")
print("=" * 70)
print(f"Baseline test AUC: {auc_baseline:.4f}")
print(f"Tuned    test AUC: {auc_tuned:.4f}")
diff = auc_tuned - auc_baseline
print(f"Difference:        {diff:+.4f}")

if abs(diff) < 0.005:
    print("Verdict: tuning did NOT meaningfully change test performance — ship baseline (simpler)")
elif diff > 0:
    print("Verdict: tuning HELPED on test — ship tuned")
else:
    print("Verdict: tuning HURT on test (overfit to val) — ship baseline")

# ---- Save baseline probs for 2b ----
np.save(REPORTS / "test_probs_baseline.npy", probs_baseline)
print(f"\nSaved {REPORTS / 'test_probs_baseline.npy'}")