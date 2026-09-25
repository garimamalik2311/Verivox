from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


INPUT_PATH = Path("reports/prosody_dataset_split.csv")
MODEL_PATH = Path("reports/prosody_logreg.joblib")

FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "yin_voiced_ratio",
    "pitch_range",
    "pitch_change_rate",
    "language",
]

NUMERIC_FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "yin_voiced_ratio",
    "pitch_range",
    "pitch_change_rate",
]

CATEGORICAL_FEATURES = [
    "language",
]


def main() -> None:
    df = pd.read_csv(INPUT_PATH)

    train = df[df["split"] == "train"].copy()
    test = df[df["split"] == "test"].copy()

    X_train = train[FEATURES]
    y_train = train["label"]

    X_test = test[FEATURES]
    y_test = test["label"]

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer([
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
        ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
    ])

    model = Pipeline([
        ("preprocessor", preprocessor),
        (
            "classifier",
            LogisticRegression(
                max_iter=2000,
                class_weight="balanced",
                random_state=42,
            ),
        ),
    ])

    print("Training prosody classifier...")
    model.fit(X_train, y_train)

    probabilities = model.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.50).astype(int)

    print()
    print("=== Test ROC-AUC ===")
    print(f"{roc_auc_score(y_test, probabilities):.4f}")

    print()
    print("=== Test Accuracy ===")
    print(f"{accuracy_score(y_test, predictions):.4f}")

    print()
    print("=== Confusion Matrix ===")
    print(confusion_matrix(y_test, predictions))

    print()
    print("=== Classification Report ===")
    print(
        classification_report(
            y_test,
            predictions,
            target_names=["bonafide", "spoof"],
            digits=4,
        )
    )

    print()
    print("=== ROC-AUC by language ===")

    for language in ["en", "hi", "ta"]:
        mask = test["language"] == language

        language_auc = roc_auc_score(
            y_test[mask],
            probabilities[mask],
        )

        print(f"{language}: {language_auc:.4f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print()
    print(f"Saved: {MODEL_PATH}")


if __name__ == "__main__":
    main()
