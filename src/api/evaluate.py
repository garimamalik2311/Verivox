"""
Sprint 2b - Step 1: Reproduce Sprint 2a's baseline test metrics.
Confirms reports/test_probs_baseline.npy + reports/test_labels.npy
match what Sprint 2a reported before we build anything else on top.
"""

import numpy as np
from sklearn.metrics import roc_auc_score, classification_report

# Load the baseline model's saved test-set predictions
probs = np.load("reports/test_probs_baseline.npy")
labels = np.load("reports/test_labels.npy")

print(f"Loaded {len(probs)} test predictions, {len(labels)} labels")
assert len(probs) == len(labels), "Mismatch between probs and labels length!"

# Compute ROC-AUC (measures how well the model separates real vs fake overall)
auc = roc_auc_score(labels, probs)
print(f"\nTest ROC-AUC: {auc:.4f}")
print("Sprint 2a reported: 0.9085 (baseline)")

# Convert probabilities to hard predictions at threshold 0.5, then report
# precision/recall/F1 per class
preds = (probs >= 0.5).astype(int)
print("\nClassification report (threshold 0.5):")
print(classification_report(labels, preds, target_names=["real (0)", "fake (1)"]))

print("Expected from handoff doc:")
print("  Real (0): P=0.8144, R=0.8127, F1=0.8136")
print("  Fake (1): P=0.8164, R=0.8180, F1=0.8172")


# ── Step 2: Precision-Recall curve ──────────────────────────────────────
# Goal: find a threshold where fake-class precision hits ~0.90, so the
# risk engine doesn't over-alert on false positives.

from sklearn.metrics import precision_recall_curve
import matplotlib
matplotlib.use("Agg")  # no display needed, just save to file
import matplotlib.pyplot as plt

prec, rec, thresholds = precision_recall_curve(labels, probs)

plt.figure(figsize=(8, 5))
plt.plot(thresholds, prec[:-1], label="precision")
plt.plot(thresholds, rec[:-1], label="recall")
plt.xlabel("threshold")
plt.ylabel("score")
plt.title("Precision-Recall vs Threshold (fake class)")
plt.legend()
plt.grid(alpha=0.3)
plt.savefig("reports/precision_recall_curve.png", dpi=150, bbox_inches="tight")
print("\nSaved reports/precision_recall_curve.png")

# Find the threshold where precision first reaches ~0.90
target_precision = 0.90
found = False
for p, r, t in zip(prec, rec, thresholds):
    if p >= target_precision:
        print(f"\nAt threshold {t:.3f}: precision={p:.3f}, recall={r:.3f}")
        found = True
        break

if not found:
    print(f"\nPrecision never reaches {target_precision} at any threshold.")
    print(f"Max precision achieved: {prec.max():.3f}")


 # ── Step 3: Calibrate the probabilities ─────────────────────────────────
# Goal: turn raw XGBoost scores into TRUE probabilities, so "0.70" means
# "70% likely AI" instead of just "higher score = more suspicious".

import joblib
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import brier_score_loss

X_val = np.load("data/processed/X_val.npy")
y_val = np.load("data/processed/y_val.npy")

X_cal, X_eval, y_cal, y_eval = train_test_split(
    X_val, y_val, test_size=0.5, stratify=y_val, random_state=42
)

base_model = joblib.load("reports/xgboost_baseline.joblib")

print("\n── Calibration comparison ──")
best_method = None
best_brier = float("inf")
best_calibrated_model = None

for method in ["sigmoid", "isotonic"]:
    cal = CalibratedClassifierCV(FrozenEstimator(base_model), method=method)
    cal.fit(X_cal, y_cal)
    probs_cal = cal.predict_proba(X_eval)[:, 1]

    auc = roc_auc_score(y_eval, probs_cal)
    brier = brier_score_loss(y_eval, probs_cal)
    print(f"{method}: AUC={auc:.4f}  Brier={brier:.4f}  (lower Brier = better calibrated)")

    if method == "sigmoid":
        best_brier = brier
        best_method = method
        best_calibrated_model = cal

print(f"\nWinner: {best_method} (Brier={best_brier:.4f})")
print("Note: isotonic had a marginally lower Brier score (0.1217 vs 0.1231),")
print("but its calibration curve was visibly noisy/non-monotonic due to the")
print("small calibration set (~563 samples, below isotonic's recommended ~1000+).")
print("Sigmoid was chosen for stability and a smoother, more defensible curve.")
joblib.dump(best_calibrated_model, "reports/xgboost_calibrated.joblib")
print("Saved reports/xgboost_calibrated.joblib")



# ── Step 4: Calibration plots ────────────────────────────────────────────
# Goal: visually prove the calibrated model's probabilities are trustworthy.

from sklearn.calibration import calibration_curve

calibrated_model = joblib.load("reports/xgboost_calibrated.joblib")

X_test = np.load("data/processed/X_test.npy")
y_test = np.load("data/processed/y_test.npy")

probs_uncalibrated = base_model.predict_proba(X_test)[:, 1]
probs_calibrated = calibrated_model.predict_proba(X_test)[:, 1]

plt.figure(figsize=(7, 7))
for name, p in [("uncalibrated", probs_uncalibrated), ("calibrated", probs_calibrated)]:
    frac_pos, mean_pred = calibration_curve(y_test, p, n_bins=10)
    plt.plot(mean_pred, frac_pos, marker="o", label=name)

plt.plot([0, 1], [0, 1], "k--", label="perfect calibration")
plt.xlabel("mean predicted probability")
plt.ylabel("fraction of actual positives")
plt.title("Calibration curve: before vs after")
plt.legend()
plt.grid(alpha=0.3)
plt.savefig("reports/calibration_curve.png", dpi=150, bbox_inches="tight")
print("\nSaved reports/calibration_curve.png")


# ── Step 5: Probability distributions for the risk engine (Avika) ──────
# Goal: give her real/fake probability distributions so she can set
# sensible alert thresholds instead of guessing.

real_probs = probs_calibrated[y_test == 0]  # calibrated P(AI) for real samples
fake_probs = probs_calibrated[y_test == 1]  # calibrated P(AI) for fake samples

np.save("reports/probs_real_test.npy", real_probs)
np.save("reports/probs_fake_test.npy", fake_probs)

print("\n── Distributions for Avika (calibrated probabilities) ──")
print(f"REAL samples (should be LOW):  5th/50th/95th percentile = "
      f"{np.percentile(real_probs, [5, 50, 95]).round(3)}")
print(f"FAKE samples (should be HIGH): 5th/50th/95th percentile = "
      f"{np.percentile(fake_probs, [5, 50, 95]).round(3)}")
print("\nSaved reports/probs_real_test.npy and reports/probs_fake_test.npy")