from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


INPUT_PATH = Path("reports/prosody_dataset_split.csv")

NUMERIC_FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate",
]

CATEGORICAL_FEATURES = ["language"]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def make_model():
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

    return Pipeline([
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


def main():
    df = pd.read_csv(INPUT_PATH)

    X = df[FEATURES]
    y = df["label"]
    groups = df["language"] + "::" + df["group"]

    cv = StratifiedGroupKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    overall_scores = []
    language_scores = {
        "en": [],
        "hi": [],
        "ta": [],
    }

    print("=== 5-Fold Group-Based Cross Validation ===")

    for fold, (train_idx, test_idx) in enumerate(
        cv.split(X, y, groups),
        start=1,
    ):
        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]

        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        model = make_model()
        model.fit(X_train, y_train)

        probabilities = model.predict_proba(X_test)[:, 1]

        overall_auc = roc_auc_score(
            y_test,
            probabilities,
        )

        overall_scores.append(overall_auc)

        print()
        print(f"Fold {fold}")
        print(f"  Overall ROC-AUC: {overall_auc:.4f}")

        for language in ["en", "hi", "ta"]:
            mask = df.iloc[test_idx]["language"] == language

            auc = roc_auc_score(
                y_test[mask],
                probabilities[mask],
            )

            language_scores[language].append(auc)

            print(
                f"  {language}: {auc:.4f}"
            )

    print()
    print("=== Cross-Validation Summary ===")

    print(
        f"Overall: "
        f"{np.mean(overall_scores):.4f} "
        f"+/- {np.std(overall_scores):.4f}"
    )

    for language in ["en", "hi", "ta"]:
        scores = language_scores[language]

        print(
            f"{language}: "
            f"{np.mean(scores):.4f} "
            f"+/- {np.std(scores):.4f}"
        )


if __name__ == "__main__":
    main()
