import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


INPUT_PATH = "reports/prosody_dataset_split.csv"


FEATURE_SETS = {
    "PYIN_ONLY": [
        "duration",
        "f0_mean",
        "f0_std",
        "pitch_range",
        "pitch_change_rate",
        "language",
    ],

    "YIN_ONLY": [
        "duration",
        "yin_f0_mean",
        "yin_f0_std",
        "language",
    ],

    "PITCH_ALL": [
        "duration",
        "f0_mean",
        "f0_std",
        "yin_f0_mean",
        "yin_f0_std",
        "pitch_range",
        "pitch_change_rate",
        "language",
    ],

    "DYNAMIC_ONLY": [
        "duration",
        "f0_std",
        "yin_f0_std",
        "pitch_range",
        "pitch_change_rate",
        "language",
    ],
}


def make_model(numeric_features, categorical_features):
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    preprocessor = ColumnTransformer([
        ("numeric", numeric_pipeline, numeric_features),
        ("categorical", categorical_pipeline, categorical_features),
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


def evaluate_feature_set(df, features):
    numeric_features = [
        feature
        for feature in features
        if feature != "language"
    ]

    categorical_features = ["language"]

    X = df[features]
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

    for train_idx, test_idx in cv.split(X, y, groups):
        model = make_model(
            numeric_features,
            categorical_features,
        )

        model.fit(
            X.iloc[train_idx],
            y.iloc[train_idx],
        )

        probabilities = model.predict_proba(
            X.iloc[test_idx]
        )[:, 1]

        y_test = y.iloc[test_idx]

        overall_scores.append(
            roc_auc_score(
                y_test,
                probabilities,
            )
        )

        for language in language_scores:
            mask = (
                df.iloc[test_idx]["language"]
                == language
            )

            language_scores[language].append(
                roc_auc_score(
                    y_test[mask],
                    probabilities[mask],
                )
            )

    return {
        "overall_mean": np.mean(overall_scores),
        "overall_std": np.std(overall_scores),
        "en": np.mean(language_scores["en"]),
        "hi": np.mean(language_scores["hi"]),
        "ta": np.mean(language_scores["ta"]),
    }


def main():
    df = pd.read_csv(INPUT_PATH)

    print("=== Prosody Feature Set Comparison ===")

    for name, features in FEATURE_SETS.items():
        result = evaluate_feature_set(
            df,
            features,
        )

        print()
        print(name)

        print(
            f"  Overall: "
            f"{result['overall_mean']:.4f} "
            f"+/- {result['overall_std']:.4f}"
        )

        print(f"  English: {result['en']:.4f}")
        print(f"  Hindi:   {result['hi']:.4f}")
        print(f"  Tamil:   {result['ta']:.4f}")


if __name__ == "__main__":
    main()
