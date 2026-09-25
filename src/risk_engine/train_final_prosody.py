from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline


DATA = Path("reports/prosody_pitch_change_comparison.csv")
OUT = Path("reports/prosody_hgb_calibrated.joblib")

RANDOM_STATE = 42
N_SPLITS = 5

# IMPORTANT:
# Language is intentionally excluded.
#
# The SpeechBrain 45-language model was not reliable on this
# en/hi/ta dataset, especially for Hindi. The prosody model
# therefore uses only language-independent acoustic features.
FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate_corrected",
]

NUMERIC_FEATURES = FEATURES


def make_base_model():
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline([
                    (
                        "imputer",
                        SimpleImputer(strategy="median"),
                    ),
                ]),
                NUMERIC_FEATURES,
            ),
        ],
        remainder="drop",
    )

    hgb = HistGradientBoostingClassifier(
        max_iter=200,
        learning_rate=0.05,
        max_leaf_nodes=15,
        min_samples_leaf=10,
        l2_regularization=1.0,
        random_state=RANDOM_STATE,
    )

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", hgb),
    ])


def main():
    df = pd.read_csv(DATA)

    print(f"Loaded {len(df)} rows")

    missing = [
        feature
        for feature in FEATURES
        if feature not in df.columns
    ]

    if missing:
        raise RuntimeError(
            f"Missing required features: {missing}"
        )

    X = df[FEATURES].copy()
    y = df["label"].astype(int)

    # Keep the original recording source as the grouping unit.
    # Language is NOT used as an input feature.
    groups = (
        df["language"].astype(str)
        + "::"
        + df["group"].astype(str)
    )

    splitter = StratifiedGroupKFold(
        n_splits=N_SPLITS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    oof = np.full(len(df), np.nan)

    print("\nGenerating language-independent group-safe OOF probabilities...")

    for fold, (train_idx, test_idx) in enumerate(
        splitter.split(X, y, groups),
        start=1,
    ):
        model = make_base_model()

        model.fit(
            X.iloc[train_idx],
            y.iloc[train_idx],
        )

        oof[test_idx] = model.predict_proba(
            X.iloc[test_idx]
        )[:, 1]

        auc = roc_auc_score(
            y.iloc[test_idx],
            oof[test_idx],
        )

        print(
            f"  Fold {fold}: AUC={auc:.4f}"
        )

    if np.isnan(oof).any():
        raise RuntimeError(
            "OOF probabilities contain NaN values"
        )

    overall_auc = roc_auc_score(y, oof)

    print(
        f"\nLanguage-independent OOF ROC-AUC: "
        f"{overall_auc:.4f}"
    )

    print("\nThreshold analysis:")

    threshold_rows = []

    for threshold in np.arange(
        0.30,
        0.701,
        0.05,
    ):
        pred = (oof >= threshold).astype(int)

        precision, recall, f1, _ = (
            precision_recall_fscore_support(
                y,
                pred,
                average="binary",
                zero_division=0,
            )
        )

        tn, fp, fn, tp = confusion_matrix(
            y,
            pred,
            labels=[0, 1],
        ).ravel()

        specificity = (
            tn / (tn + fp)
            if (tn + fp)
            else 0.0
        )

        threshold_rows.append({
            "threshold": threshold,
            "accuracy": accuracy_score(y, pred),
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "specificity": specificity,
        })

        print(
            f"  {threshold:.2f} | "
            f"acc={accuracy_score(y, pred):.4f} | "
            f"precision={precision:.4f} | "
            f"recall={recall:.4f} | "
            f"specificity={specificity:.4f} | "
            f"f1={f1:.4f}"
        )

    pd.DataFrame(threshold_rows).to_csv(
        "reports/prosody_threshold_analysis_language_free.csv",
        index=False,
    )

    # ---------------------------------------------------------------
    # Calibration
    # ---------------------------------------------------------------

    print("\nFitting calibrated final model...")

    calibration_model = make_base_model()

    calibrated = CalibratedClassifierCV(
        estimator=calibration_model,
        method="sigmoid",
        cv=5,
    )

    calibrated.fit(X, y)

    calibrated_oof_auc = overall_auc

    artifact = {
        "model": calibrated,
        "model_version": "prosody-hgb-calibrated-language-free-v1",
        "model_type": "CalibratedHistGradientBoosting",
        "training_rows": int(len(df)),
        "oof_auc": float(calibrated_oof_auc),
        "features": FEATURES,
        "feature_type": "language-independent-acoustic",
        "threshold": 0.50,
        "random_state": RANDOM_STATE,
        "n_splits": N_SPLITS,
        "group_definition": "language::recording_group",
    }

    joblib.dump(
        artifact,
        OUT,
    )

    print("\nSaved:")
    print(f"  {OUT}")

    print("\nArtifact:")
    print("  version:", artifact["model_version"])
    print("  type:", artifact["model_type"])
    print("  features:", artifact["features"])
    print("  training_rows:", artifact["training_rows"])
    print("  OOF AUC:", artifact["oof_auc"])
    print("  threshold:", artifact["threshold"])


if __name__ == "__main__":
    main()
