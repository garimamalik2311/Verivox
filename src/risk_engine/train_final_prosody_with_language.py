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
from sklearn.preprocessing import OneHotEncoder


DATA = Path("reports/prosody_pitch_change_comparison.csv")
OUT = Path("reports/prosody_hgb_calibrated.joblib")

RANDOM_STATE = 42
N_SPLITS = 5

FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate_corrected",
    "language",
]

NUMERIC_FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate_corrected",
]

CATEGORICAL_FEATURES = ["language"]


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
            (
                "categorical",
                Pipeline([
                    (
                        "imputer",
                        SimpleImputer(
                            strategy="most_frequent"
                        ),
                    ),
                    (
                        "onehot",
                        OneHotEncoder(
                            handle_unknown="ignore",
                            sparse_output=False,
                        ),
                    ),
                ]),
                CATEGORICAL_FEATURES,
            ),
        ]
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

    groups = (
        df["language"].astype(str)
        + "::"
        + df["group"].astype(str)
    )

    # ---------------------------------------------------------------
    # 1. Generate honest out-of-fold probabilities.
    #    These are used ONLY for calibration/threshold analysis.
    # ---------------------------------------------------------------

    splitter = StratifiedGroupKFold(
        n_splits=N_SPLITS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    oof = np.full(len(df), np.nan)

    print("\nGenerating group-safe OOF probabilities...")

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
        f"\nOOF ROC-AUC: {overall_auc:.4f}"
    )

    # ---------------------------------------------------------------
    # 2. Evaluate threshold behavior.
    # ---------------------------------------------------------------

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

    threshold_df = pd.DataFrame(threshold_rows)

    threshold_df.to_csv(
        "reports/prosody_threshold_analysis.csv",
        index=False,
    )

    # ---------------------------------------------------------------
    # 3. Calibration diagnostics.
    # ---------------------------------------------------------------

    calibration_rows = []

    bins = [
        0.0,
        0.1,
        0.2,
        0.3,
        0.4,
        0.5,
        0.6,
        0.7,
        0.8,
        0.9,
        1.0,
    ]

    for low, high in zip(
        bins[:-1],
        bins[1:],
    ):
        if high == 1.0:
            mask = (
                (oof >= low)
                & (oof <= high)
            )
        else:
            mask = (
                (oof >= low)
                & (oof < high)
            )

        if not np.any(mask):
            continue

        calibration_rows.append({
            "bin_low": low,
            "bin_high": high,
            "count": int(mask.sum()),
            "mean_probability": float(
                np.mean(oof[mask])
            ),
            "actual_spoof_rate": float(
                np.mean(y[mask])
            ),
        })

    calibration_df = pd.DataFrame(
        calibration_rows
    )

    calibration_df.to_csv(
        "reports/prosody_calibration_bins.csv",
        index=False,
    )

    print("\nCalibration bins:")
    print(
        calibration_df.to_string(index=False)
    )

    # ---------------------------------------------------------------
    # 4. Train final model on ALL available recordings.
    # ---------------------------------------------------------------

    print(
        "\nTraining final HGB on all 1800 recordings..."
    )

    final_base = make_base_model()

    # Isotonic calibration needs enough samples and is more flexible.
    # CV=5 is group-safe only for the outer validation above; the final
    # artifact is trained on all available data after validation.
    final_model = CalibratedClassifierCV(
        estimator=final_base,
        method="isotonic",
        cv=5,
        ensemble=True,
    )

    final_model.fit(X, y)

    # ---------------------------------------------------------------
    # 5. Save artifact + metadata.
    # ---------------------------------------------------------------

    artifact = {
        "model": final_model,
        "features": FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "label_mapping": {
            0: "bonafide",
            1: "spoof",
        },
        "model_type": "CalibratedHistGradientBoosting",
        "model_version": "prosody-hgb-calibrated-v1",
        "random_state": RANDOM_STATE,
        "training_rows": len(df),
        "oof_auc": float(overall_auc),
        "notes": (
            "Group-safe OOF validation. "
            "pitch_change_rate_corrected is the "
            "adjacent-valid-frame pYIN diagnostic definition."
        ),
    }

    joblib.dump(
        artifact,
        OUT,
    )

    print(
        f"\nSaved final artifact: {OUT}"
    )

    print("\nArtifact contents:")
    print(f"  model_version: {artifact['model_version']}")
    print(f"  features: {len(FEATURES)}")
    print(f"  training_rows: {len(df)}")
    print(f"  OOF AUC: {overall_auc:.4f}")

    print("\nOutput files:")
    print("  reports/prosody_hgb_calibrated.joblib")
    print("  reports/prosody_threshold_analysis.csv")
    print("  reports/prosody_calibration_bins.csv")


if __name__ == "__main__":
    main()
