"""
Sprint 2a — Model Selection & Sprint 2b Sigmoid Calibration
VeriVox: Real-time multilingual AI voice-cloning detection.

Trains and compares:
  - XGBoost (baseline + tuned 58-D + calibrated)
  - Random Forest
  - Logistic Regression
  - KNN
"""

import time
import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt

from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.calibration import CalibratedClassifierCV  # ADDED BY PERSON B
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

PROCESSED = Path("data/processed")
REPORTS = Path("reports")
REPORTS.mkdir(exist_ok=True)


# ---------------------------------------------------------------- 1. LOAD
def load_data():
    print("=" * 70)
    print("1. LOAD & INSPECT (58-D FEATURE ARRAYS)") # MODIFIED BY PERSON B
    print("=" * 70)
    X_train = np.load(PROCESSED / "X_train.npy")
    y_train = np.load(PROCESSED / "y_train.npy")
    X_val = np.load(PROCESSED / "X_val.npy")
    y_val = np.load(PROCESSED / "y_val.npy")
    X_test = np.load(PROCESSED / "X_test.npy")
    y_test = np.load(PROCESSED / "y_test.npy")

    print(f"X_train: {X_train.shape}  {X_train.dtype}")
    print(f"y_train: {y_train.shape}  {y_train.dtype}")
    print(f"X_val  : {X_val.shape}    {X_val.dtype}")
    print(f"y_val  : {y_val.shape}    {y_val.dtype}")
    print(f"X_test : {X_test.shape}    {X_test.dtype}")
    print(f"y_test : {y_test.shape}    {y_test.dtype}")
    print(f"\nNaN in train: {np.isnan(X_train).any()}")
    print(f"NaN in val  : {np.isnan(X_val).any()}")
    print(f"NaN in test : {np.isnan(X_test).any()}")
    print(f"\nTrain label counts: {np.bincount(y_train.astype(int))}")
    print(f"Val   label counts: {np.bincount(y_val.astype(int))}")
    print(f"Test  label counts: {np.bincount(y_test.astype(int))}")
    return X_train, y_train, X_val, y_val, X_test, y_test


# ---------------------------------------------------------------- 2. EDA
def eda(X_train, y_train):
    print("\n" + "=" * 70)
    print("2. EDA")
    print("=" * 70)

    counts = np.bincount(y_train.astype(int))
    print(f"Class balance: real={counts[0]}  fake={counts[1]}  "
          f"ratio={counts[0] / counts[1]:.2f}")

    var = X_train.var(axis=0)
    dead = np.where(var < 1e-6)[0]
    print(f"\nFeatures with ~zero variance: {len(dead)} {dead.tolist()}")
    print(f"Feature variance range: [{var.min():.4e}, {var.max():.4e}]")

    corr = np.corrcoef(X_train.T)
    high_corr = []
    for i in range(corr.shape[0]):
        for j in range(i + 1, corr.shape[1]):
            if abs(corr[i, j]) > 0.95:
                high_corr.append((i, j, round(corr[i, j], 4)))
    print(f"Feature pairs with |r| > 0.95: {len(high_corr)}")
    for pair in high_corr[:10]:
        print(f"  features {pair[0]} & {pair[1]}: r={pair[2]}")

    # MODIFIED BY PERSON B: Updated plot layout grid to 12x5 for 58 features
    fig, axes = plt.subplots(12, 5, figsize=(18, 24))
    for i, ax in enumerate(axes.flat):
        if i >= X_train.shape[1]:
            ax.axis("off")
            continue
        ax.hist(X_train[:, i], bins=40, color="steelblue", alpha=0.8)
        ax.set_title(f"feat {i}", fontsize=8)
        ax.tick_params(labelsize=6)
    plt.tight_layout()
    plt.savefig(REPORTS / "eda_feature_distributions.png", dpi=90)
    plt.close()
    print(f"\nSaved {REPORTS / 'eda_feature_distributions.png'}")


# ---------------------------------------------------------------- 3. BASELINE
def xgboost_baseline(X_train, y_train, X_val, y_val):
    print("\n" + "=" * 70)
    print("3. XGBOOST BASELINE (untuned 58-D)") # MODIFIED BY PERSON B
    print("=" * 70)
    clf = XGBClassifier(
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
    t0 = time.time()
    clf.fit(X_train, y_train)
    fit_time = time.time() - t0

    probs = clf.predict_proba(X_val)[:, 1]
    preds = clf.predict(X_val)
    print(f"Fit time: {fit_time:.2f}s")
    print(f"Val ROC-AUC: {roc_auc_score(y_val, probs):.4f}")
    print()
    print(classification_report(y_val, preds, digits=4))
    return clf


# ---------------------------------------------------------------- 4. TUNING
def tune_xgboost(X_train, y_train):
    print("\n" + "=" * 70)
    print("4. XGBOOST HYPERPARAMETER TUNING")
    print("=" * 70)

    param_grid = {
        "n_estimators": [200, 300, 500],
        "max_depth": [4, 6, 8],
        "learning_rate": [0.05, 0.1, 0.2],
        "subsample": [0.8, 0.9, 1.0],
        "colsample_bytree": [0.8, 0.9, 1.0],
    }

    base = XGBClassifier(
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    grid = GridSearchCV(
        estimator=base,
        param_grid=param_grid,
        scoring="roc_auc",
        cv=5,
        n_jobs=-1,
        verbose=1,
    )
    t0 = time.time()
    grid.fit(X_train, y_train)
    elapsed = time.time() - t0

    print(f"\nGrid search time: {elapsed:.1f}s")
    print(f"Best params: {grid.best_params_}")
    print(f"Best CV ROC-AUC: {grid.best_score_:.4f}")
    return grid.best_estimator_, grid.best_params_, grid.best_score_


# ---------------------------------------------------------------- 5. COMPARE
def build_models():
    return {
        "XGBoost": XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.1,
            subsample=0.9, colsample_bytree=0.9,
            eval_metric="logloss", random_state=42, n_jobs=-1,
            tree_method="hist",
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=300, max_depth=None, random_state=42, n_jobs=-1,
        ),
        "LogisticRegression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, random_state=42)),
        ]),
        "KNN": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", KNeighborsClassifier(n_neighbors=5, n_jobs=-1)),
        ]),
    }


def compare_models(X_train, y_train, X_val, y_val):
    print("\n" + "=" * 70)
    print("5. MODEL COMPARISON")
    print("=" * 70)
    rows = []
    for name, model in build_models().items():
        t0 = time.time()
        model.fit(X_train, y_train)
        fit_time = time.time() - t0
        preds = model.predict(X_val)
        probs = model.predict_proba(X_val)[:, 1]
        rows.append({
            "model": name,
            "accuracy": accuracy_score(y_val, preds),
            "precision": precision_score(y_val, preds, zero_division=0),
            "recall": recall_score(y_val, preds, zero_division=0),
            "f1": f1_score(y_val, preds, zero_division=0),
            "roc_auc": roc_auc_score(y_val, probs),
            "fit_time_s": round(fit_time, 2),
        })
        print(f"{name:20s}  acc={rows[-1]['accuracy']:.4f}  "
              f"f1={rows[-1]['f1']:.4f}  auc={rows[-1]['roc_auc']:.4f}  "
              f"({fit_time:.1f}s)")

    df = pd.DataFrame(rows).sort_values("roc_auc", ascending=False)
    df.to_csv(REPORTS / "model_comparison.csv", index=False)
    print(f"\nSaved {REPORTS / 'model_comparison.csv'}")
    print()
    print(df.to_string(index=False))
    return df


# ---------------------------------------------------------------- MAIN
def main():
    X_train, y_train, X_val, y_val, X_test, y_test = load_data()
    eda(X_train, y_train)
    xgboost_baseline(X_train, y_train, X_val, y_val)

    tuned, best_params, best_score = tune_xgboost(X_train, y_train)

    # ADDED BY PERSON B: Sigmoid probability calibration on tuned 58-D XGBoost model
    print("\n" + "=" * 70)
    print("SIGMOID CALIBRATION (58-D MODEL)")
    print("=" * 70)
    calibrated_model = CalibratedClassifierCV(estimator=tuned, method="sigmoid", cv=5)
    calibrated_model.fit(X_train, y_train)

    probs = calibrated_model.predict_proba(X_val)[:, 1]
    print(f"\nCalibrated model on val:")
    print(classification_report(y_val, calibrated_model.predict(X_val), digits=4))
    print(f"Val ROC-AUC: {roc_auc_score(y_val, probs):.4f}")

    # Evaluate calibrated model on holdout test set
    probs_test = calibrated_model.predict_proba(X_test)[:, 1]
    print("\n" + "=" * 70)
    print("CALIBRATED 58-D MODEL ON TEST HOLDOUT") # MODIFIED BY PERSON B
    print("=" * 70)
    print(classification_report(y_test, calibrated_model.predict(X_test), digits=4))
    print(f"Test ROC-AUC: {roc_auc_score(y_test, probs_test):.4f}")

    # Save test probabilities for calibration checks
    np.save(REPORTS / "test_probs.npy", probs_test)
    np.save(REPORTS / "test_labels.npy", y_test)
    print(f"\nSaved {REPORTS / 'test_probs.npy'}")
    print(f"Saved {REPORTS / 'test_labels.npy'}")

    # MODIFIED BY PERSON B: Persist calibrated and tuned artifacts
    joblib.dump(calibrated_model, REPORTS / "xgboost_58d_calibrated.joblib")
    joblib.dump(calibrated_model, REPORTS / "xgboost_calibrated.joblib")
    joblib.dump(tuned, REPORTS / "xgboost_tuned.joblib")
    with open(REPORTS / "xgboost_best_params.json", "w") as f:
        json.dump({"best_params": best_params, "cv_roc_auc": best_score}, f, indent=2)
    print(f"\nSaved {REPORTS / 'xgboost_58d_calibrated.joblib'}")
    print(f"Saved {REPORTS / 'xgboost_tuned.joblib'}")
    print(f"Saved {REPORTS / 'xgboost_best_params.json'}")

    compare_models(X_train, y_train, X_val, y_val)


if __name__ == "__main__":
    main()