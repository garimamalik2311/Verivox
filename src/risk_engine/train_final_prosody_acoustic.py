from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV


DATA_PATH = Path(
    "reports/prosody_acoustic_combined_window_dataset.csv"
)

OUTPUT_PATH = Path(
    "reports/prosody_hgb_acoustic_calibrated.joblib"
)

FEATURES = [
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate_corrected",
    "centroid_mean",
    "centroid_std",
    "bandwidth_mean",
    "bandwidth_std",
]

MODEL_VERSION = (
    "prosody-hgb-acoustic-calibrated-v1"
)

THRESHOLD = 0.50


def main():
    df = pd.read_csv(DATA_PATH)

    X = df[FEATURES].astype(float)
    y = df["label"].astype(int)

    print(
        f"Loaded {len(df)} training windows"
    )

    print(
        f"Features: {len(FEATURES)}"
    )

    print()
    print("Training HistGradientBoostingClassifier...")

    base_model = HistGradientBoostingClassifier(
        max_iter=200,
        learning_rate=0.05,
        max_leaf_nodes=15,
        random_state=42,
    )

    model = CalibratedClassifierCV(
        estimator=base_model,
        method="sigmoid",
        cv=5,
    )

    model.fit(X, y)

    artifact = {
        "model": model,
        "model_version": MODEL_VERSION,
        "model_type": (
            "CalibratedHistGradientBoosting"
        ),
        "features": FEATURES,
        "training_rows": len(df),
        "threshold": THRESHOLD,
        "training_dataset": str(DATA_PATH),
    }

    joblib.dump(
        artifact,
        OUTPUT_PATH,
    )

    print()
    print(
        f"Saved: {OUTPUT_PATH}"
    )

    print()
    print("Artifact:")
    print(
        "  model_version:",
        MODEL_VERSION,
    )
    print(
        "  model_type:",
        artifact["model_type"],
    )
    print(
        "  training_rows:",
        artifact["training_rows"],
    )
    print(
        "  threshold:",
        artifact["threshold"],
    )
    print(
        "  features:",
        artifact["features"],
    )


if __name__ == "__main__":
    main()
