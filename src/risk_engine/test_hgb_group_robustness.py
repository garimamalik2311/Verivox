from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATA = Path("reports/prosody_pitch_change_comparison.csv")
RANDOM_STATE = 42
N_SPLITS = 5

FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate_corrected",
    "language",
]


def make_model(features):
    numeric = [f for f in features if f != "language"]
    categorical = ["language"]

    pre = ColumnTransformer(
        [
            (
                "num",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="median")),
                ]),
                numeric,
            ),
            (
                "cat",
                Pipeline([
                    (
                        "imputer",
                        SimpleImputer(strategy="most_frequent"),
                    ),
                    (
                        "onehot",
                        OneHotEncoder(
                            handle_unknown="ignore",
                            sparse_output=False,
                        ),
                    ),
                ]),
                categorical,
            ),
        ]
    )

    return Pipeline([
        ("pre", pre),
        (
            "hgb",
            HistGradientBoostingClassifier(
                max_iter=200,
                learning_rate=0.05,
                max_leaf_nodes=15,
                min_samples_leaf=10,
                l2_regularization=1.0,
                random_state=RANDOM_STATE,
            ),
        ),
    ])


def main():
    df = pd.read_csv(DATA)

    # Remove accidental duplicate from the feature list.
    features = list(dict.fromkeys(FEATURES))

    print(f"Loaded {len(df)} rows")

    # Each recording belongs to exactly one source group.
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

    fold_results = []

    for fold, (train_idx, test_idx) in enumerate(
        splitter.split(df, df["label"], groups),
        start=1,
    ):
        train = df.iloc[train_idx]
        test = df.iloc[test_idx]

        model = make_model(features)

        model.fit(
            train[features],
            train["label"],
        )

        probabilities = model.predict_proba(
            test[features]
        )[:, 1]

        oof[test_idx] = probabilities

        overall = roc_auc_score(
            test["label"],
            probabilities,
        )

        print(
            f"Fold {fold}: overall AUC = {overall:.4f}"
        )

        for language in ["en", "hi", "ta"]:
            mask = test["language"] == language

            auc = roc_auc_score(
                test.loc[mask, "label"],
                probabilities[mask],
            )

            print(
                f"         {language}: {auc:.4f}"
            )

        fold_results.append(overall)

    print("\n" + "=" * 78)
    print("OVERALL GROUP-SAFE CV")
    print("=" * 78)

    print(
        f"AUC = {np.mean(fold_results):.4f} "
        f"+/- {np.std(fold_results):.4f}"
    )

    # ------------------------------------------------------------------
    # OOF source-group analysis
    # ------------------------------------------------------------------

    result = df[
        ["language", "group", "label"]
    ].copy()

    result["oof_probability"] = oof

    group_summary = (
        result
        .groupby(
            ["language", "group", "label"],
            as_index=False,
        )
        .agg(
            n=("oof_probability", "size"),
            mean_probability=(
                "oof_probability",
                "mean",
            ),
            median_probability=(
                "oof_probability",
                "median",
            ),
            std_probability=(
                "oof_probability",
                "std",
            ),
            fraction_over_50=(
                "oof_probability",
                lambda x: np.mean(x >= 0.5),
            ),
        )
    )

    group_summary.to_csv(
        "reports/hgb_group_robustness.csv",
        index=False,
    )

    print("\n" + "=" * 78)
    print("GROUP SEPARATION")
    print("=" * 78)

    for language in ["en", "hi", "ta"]:
        subset = group_summary[
            group_summary["language"] == language
        ]

        bona = subset[subset["label"] == 0][
            "mean_probability"
        ]

        spoof = subset[subset["label"] == 1][
            "mean_probability"
        ]

        print(f"\n{language.upper()}")

        print(
            f"  Bona fide group means: "
            f"mean={bona.mean():.4f} "
            f"min={bona.min():.4f} "
            f"max={bona.max():.4f}"
        )

        print(
            f"  Spoof group means:     "
            f"mean={spoof.mean():.4f} "
            f"min={spoof.min():.4f} "
            f"max={spoof.max():.4f}"
        )

    print("\n" + "=" * 78)
    print("HARDEST BONAFIDE GROUPS")
    print("=" * 78)

    print(
        group_summary[
            group_summary["label"] == 0
        ]
        .sort_values(
            "mean_probability",
            ascending=False,
        )
        .head(15)
        .to_string(index=False)
    )

    print("\n" + "=" * 78)
    print("HARDEST SPOOF GROUPS")
    print("=" * 78)

    print(
        group_summary[
            group_summary["label"] == 1
        ]
        .sort_values(
            "mean_probability",
            ascending=True,
        )
        .head(15)
        .to_string(index=False)
    )

    print("\nWrote:")
    print("  reports/hgb_group_robustness.csv")


if __name__ == "__main__":
    main()
