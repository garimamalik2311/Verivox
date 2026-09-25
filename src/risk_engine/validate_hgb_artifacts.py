from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


DATA = Path("reports/prosody_dataset_split.csv")
RANDOM_STATE = 42
N_SPLITS = 5

ALL_FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "pitch_change_rate",
    "language",
]

FEATURE_SETS = {
    "FULL": ALL_FEATURES,
    "NO_LANGUAGE": [
        "duration",
        "f0_mean",
        "f0_std",
        "yin_f0_mean",
        "yin_f0_std",
        "pitch_range",
        "pitch_change_rate",
    ],
    "NO_DURATION": [
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


def make_model(features):
    numeric = [x for x in features if x != "language"]
    categorical = ["language"] if "language" in features else []

    transformers = []

    if numeric:
        numeric_pipe = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
            ]
        )
        transformers.append(
            ("num", numeric_pipe, numeric)
        )

    if categorical:
        categorical_pipe = Pipeline(
            [
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
            ]
        )
        transformers.append(
            ("cat", categorical_pipe, categorical)
        )

    pre = ColumnTransformer(
        transformers,
        remainder="drop",
    )

    return PipelineHGB(pre, numeric, categorical)


class PipelineHGB:
    def __init__(self, pre, numeric, categorical):
        self.pre = pre
        self.numeric = numeric
        self.categorical = categorical
        self.model = HistGradientBoostingClassifier(
            max_iter=200,
            learning_rate=0.05,
            max_leaf_nodes=15,
            min_samples_leaf=10,
            l2_regularization=1.0,
            random_state=RANDOM_STATE,
        )

    def fit(self, X, y):
        Xt = self.pre.fit_transform(X)
        self.model.fit(Xt, y)
        return self

    def predict_proba(self, X):
        Xt = self.pre.transform(X)
        return self.model.predict_proba(Xt)

    def score_auc(self, X, y):
        return roc_auc_score(y, self.predict_proba(X)[:, 1])


def evaluate_feature_set(df, features, name):
    groups = df["language"].astype(str) + "::" + df["group"].astype(str)

    splitter = StratifiedGroupKFold(
        n_splits=N_SPLITS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    fold_overall = []
    fold_by_language = {"en": [], "hi": [], "ta": []}

    for fold, (train_idx, test_idx) in enumerate(
        splitter.split(df, df["label"], groups),
        start=1,
    ):
        train = df.iloc[train_idx]
        test = df.iloc[test_idx]

        model = make_model(features)
        model.fit(train[features], train["label"])

        overall = model.score_auc(test[features], test["label"])
        fold_overall.append(overall)

        for lang in fold_by_language:
            subset = test[test["language"] == lang]
            auc = roc_auc_score(
                subset["label"],
                model.predict_proba(subset[features])[:, 1],
            )
            fold_by_language[lang].append(auc)

        print(
            f"{name:14s} fold {fold}: "
            f"overall={overall:.4f} "
            f"en={fold_by_language['en'][-1]:.4f} "
            f"hi={fold_by_language['hi'][-1]:.4f} "
            f"ta={fold_by_language['ta'][-1]:.4f}"
        )

    print(
        f"\n{name:14s} SUMMARY  "
        f"overall={np.mean(fold_overall):.4f} ± {np.std(fold_overall):.4f}  "
        f"en={np.mean(fold_by_language['en']):.4f} ± {np.std(fold_by_language['en']):.4f}  "
        f"hi={np.mean(fold_by_language['hi']):.4f} ± {np.std(fold_by_language['hi']):.4f}  "
        f"ta={np.mean(fold_by_language['ta']):.4f} ± {np.std(fold_by_language['ta']):.4f}"
    )

    return fold_overall, fold_by_language


def permutation_importance_oof(df):
    """
    Permutation importance is calculated separately on every held-out fold,
    then averaged. This avoids measuring importance on training data.
    """
    features = ALL_FEATURES
    groups = df["language"].astype(str) + "::" + df["group"].astype(str)

    splitter = StratifiedGroupKFold(
        n_splits=N_SPLITS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    importance_rows = []

    for fold, (train_idx, test_idx) in enumerate(
        splitter.split(df, df["label"], groups),
        start=1,
    ):
        train = df.iloc[train_idx]
        test = df.iloc[test_idx]

        model = make_model(features)
        model.fit(train[features], train["label"])

        baseline = model.score_auc(test[features], test["label"])

        rng = np.random.RandomState(RANDOM_STATE + fold)

        # Raw-column permutation is intentionally used here.
        # This answers: "How much does held-out AUC fall when this
        # original feature is destroyed?"
        for feature in features:
            drops = []

            for _ in range(10):
                shuffled = test[features].copy()
                shuffled[feature] = rng.permutation(
                    shuffled[feature].to_numpy()
                )

                score = model.score_auc(
                    shuffled,
                    test["label"],
                )
                drops.append(baseline - score)

            importance_rows.append(
                {
                    "fold": fold,
                    "feature": feature,
                    "auc_drop_mean": float(np.mean(drops)),
                    "auc_drop_std": float(np.std(drops)),
                }
            )

    imp = pd.DataFrame(importance_rows)

    summary = (
        imp.groupby("feature")
        .agg(
            auc_drop_mean=("auc_drop_mean", "mean"),
            auc_drop_std=("auc_drop_mean", "std"),
        )
        .sort_values("auc_drop_mean", ascending=False)
    )

    print("\nHELD-OUT PERMUTATION IMPORTANCE")
    print("--------------------------------")
    print(summary.to_string(float_format=lambda x: f"{x:.5f}"))

    summary.to_csv(
        "reports/hgb_permutation_importance.csv"
    )

    return summary


def group_behavior(df):
    """
    Each source group is label-homogeneous, so group-level ROC-AUC
    is not meaningful. Instead report the group's mean predicted
    spoof probability using OOF predictions.
    """
    groups = df["language"].astype(str) + "::" + df["group"].astype(str)

    splitter = StratifiedGroupKFold(
        n_splits=N_SPLITS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    oof_prob = np.full(len(df), np.nan)

    for train_idx, test_idx in splitter.split(
        df, df["label"], groups
    ):
        train = df.iloc[train_idx]
        test = df.iloc[test_idx]

        model = make_model(ALL_FEATURES)
        model.fit(train[ALL_FEATURES], train["label"])

        oof_prob[test_idx] = model.predict_proba(
            test[ALL_FEATURES]
        )[:, 1]

    result = df[
        ["language", "group", "label"]
    ].copy()

    result["oof_spoof_probability"] = oof_prob

    group_summary = (
        result.groupby(["language", "group", "label"])
        .agg(
            n=("oof_spoof_probability", "size"),
            mean_probability=("oof_spoof_probability", "mean"),
            median_probability=("oof_spoof_probability", "median"),
            min_probability=("oof_spoof_probability", "min"),
            max_probability=("oof_spoof_probability", "max"),
        )
        .reset_index()
    )

    group_summary.to_csv(
        "reports/hgb_group_behavior.csv",
        index=False,
    )

    print("\nMOST SUSPICIOUS BONAFIDE GROUPS")
    print("--------------------------------")
    print(
        group_summary[group_summary["label"] == 0]
        .sort_values("mean_probability", ascending=False)
        .head(10)
        .to_string(index=False)
    )

    print("\nLEAST SUSPICIOUS SPOOF GROUPS")
    print("-----------------------------")
    print(
        group_summary[group_summary["label"] == 1]
        .sort_values("mean_probability", ascending=True)
        .head(10)
        .to_string(index=False)
    )


def main():
    if not DATA.exists():
        raise FileNotFoundError(DATA)

    df = pd.read_csv(DATA)

    print(f"Loaded {len(df)} rows")
    print(
        f"Labels: {df['label'].value_counts().to_dict()}"
    )

    print("\n" + "=" * 78)
    print("HGB FEATURE-SET ABLATION")
    print("=" * 78)

    results = {}

    for name, features in FEATURE_SETS.items():
        results[name] = evaluate_feature_set(
            df,
            features,
            name,
        )
        print()

    print("\n" + "=" * 78)
    print("HELD-OUT FEATURE IMPORTANCE")
    print("=" * 78)

    permutation_importance_oof(df)

    print("\n" + "=" * 78)
    print("GROUP-LEVEL OOF BEHAVIOR")
    print("=" * 78)

    group_behavior(df)

    print("\nDone.")
    print("Wrote:")
    print("  reports/hgb_permutation_importance.csv")
    print("  reports/hgb_group_behavior.csv")


if __name__ == "__main__":
    main()
