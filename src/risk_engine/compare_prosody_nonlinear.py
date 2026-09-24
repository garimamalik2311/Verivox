import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


INPUT_PATH = "reports/prosody_dataset_split.csv"

FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate",
    "language",
]

NUMERIC_FEATURES = [f for f in FEATURES if f != "language"]
CATEGORICAL_FEATURES = ["language"]


def make_preprocessor(scale=False):
    numeric_steps = [
        ("imputer", SimpleImputer(strategy="median"))
    ]

    if scale:
        numeric_steps.append(("scaler", StandardScaler()))

    numeric_pipeline = Pipeline(numeric_steps)

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False,
        )),
    ])

    return ColumnTransformer([
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
        ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
    ])


def make_models():
    return {
        "LOGISTIC": Pipeline([
            ("preprocessor", make_preprocessor(scale=True)),
            ("classifier", LogisticRegression(
                max_iter=2000,
                class_weight="balanced",
                random_state=42,
            )),
        ]),

        "RANDOM_FOREST": Pipeline([
            ("preprocessor", make_preprocessor(scale=False)),
            ("classifier", RandomForestClassifier(
                n_estimators=500,
                max_depth=8,
                min_samples_leaf=4,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            )),
        ]),

        "HIST_GRADIENT_BOOSTING": Pipeline([
            ("preprocessor", make_preprocessor(scale=False)),
            ("classifier", HistGradientBoostingClassifier(
                max_iter=200,
                learning_rate=0.05,
                max_leaf_nodes=15,
                min_samples_leaf=10,
                l2_regularization=1.0,
                random_state=42,
            )),
        ]),
    }


def main():
    df = pd.read_csv(INPUT_PATH)

    X = df[FEATURES]
    y = df["label"]

    # Critical: group by language + source/voice group.
    groups = df["language"] + "::" + df["group"]

    cv = StratifiedGroupKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    results = {}

    for model_name, model_template in make_models().items():
        overall_scores = []
        language_scores = {
            "en": [],
            "hi": [],
            "ta": [],
        }

        print()
        print("=" * 60)
        print(model_name)
        print("=" * 60)

        for fold, (train_idx, test_idx) in enumerate(
            cv.split(X, y, groups),
            start=1,
        ):
            model = model_template

            model.fit(
                X.iloc[train_idx],
                y.iloc[train_idx],
            )

            probabilities = model.predict_proba(
                X.iloc[test_idx]
            )[:, 1]

            y_test = y.iloc[test_idx]

            overall_auc = roc_auc_score(
                y_test,
                probabilities,
            )

            overall_scores.append(overall_auc)

            print()
            print(f"Fold {fold}")
            print(f"  Overall: {overall_auc:.4f}")

            for language in ["en", "hi", "ta"]:
                mask = (
                    df.iloc[test_idx]["language"]
                    == language
                )

                auc = roc_auc_score(
                    y_test[mask],
                    probabilities[mask],
                )

                language_scores[language].append(auc)

                print(
                    f"  {language}: {auc:.4f}"
                )

        results[model_name] = {
            "overall": np.mean(overall_scores),
            "overall_std": np.std(overall_scores),
            "en": np.mean(language_scores["en"]),
            "hi": np.mean(language_scores["hi"]),
            "ta": np.mean(language_scores["ta"]),
        }

    print()
    print("=" * 60)
    print("FINAL COMPARISON")
    print("=" * 60)

    for name, r in results.items():
        print(
            f"{name:22s} "
            f"Overall={r['overall']:.4f} +/- {r['overall_std']:.4f} "
            f"EN={r['en']:.4f} "
            f"HI={r['hi']:.4f} "
            f"TA={r['ta']:.4f}"
        )


if __name__ == "__main__":
    main()
