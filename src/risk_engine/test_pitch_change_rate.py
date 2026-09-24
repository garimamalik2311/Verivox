from pathlib import Path

import librosa
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATA = Path("reports/prosody_dataset_split.csv")
RANDOM_STATE = 42
N_SPLITS = 5

BASE_FEATURES = [
    "duration",
    "f0_mean",
    "f0_std",
    "yin_f0_mean",
    "yin_f0_std",
    "pitch_range",
    "language",
]


def corrected_pitch_change_rate(path):
    """
    Calculate pitch-change rate while preserving temporal adjacency.

    Unlike the current dataset feature, this does NOT remove invalid
    frames and then compare the remaining F0 values. A change is only
    calculated when two consecutive original frames both have valid F0.
    """
    try:
        y, sr = librosa.load(path, sr=16000, mono=True)

        if len(y) == 0:
            return np.nan

        f0, _, _ = librosa.pyin(
            y,
            fmin=65.0,
            fmax=400.0,
            sr=sr,
            frame_length=1024,
            hop_length=512,
        )

        if f0 is None or len(f0) < 2:
            return np.nan

        previous = f0[:-1]
        current = f0[1:]

        valid = (
            np.isfinite(previous)
            & np.isfinite(current)
            & (previous > 0)
        )

        if not np.any(valid):
            return np.nan

        changes = (
            np.abs(current[valid] - previous[valid])
            / previous[valid]
        )

        return float(np.mean(changes))

    except Exception:
        return np.nan


def old_pitch_change_rate(path):
    """
    Reproduce the existing dataset calculation.

    This intentionally mirrors the current extraction logic:
    invalid F0 frames are removed first, so non-adjacent voiced
    frames can become adjacent.
    """
    try:
        y, sr = librosa.load(path, sr=16000, mono=True)

        if len(y) == 0:
            return np.nan

        f0, _, _ = librosa.pyin(
            y,
            fmin=65.0,
            fmax=400.0,
            sr=sr,
            frame_length=1024,
            hop_length=512,
        )

        if f0 is None:
            return np.nan

        valid_f0 = f0[np.isfinite(f0)]

        if len(valid_f0) < 2:
            return np.nan

        previous = valid_f0[:-1]
        current = valid_f0[1:]

        valid = previous > 0

        if not np.any(valid):
            return np.nan

        changes = (
            np.abs(current[valid] - previous[valid])
            / previous[valid]
        )

        return float(np.mean(changes))

    except Exception:
        return np.nan


def make_model(features):
    numeric = [f for f in features if f != "language"]
    categorical = ["language"] if "language" in features else []

    transformers = []

    if numeric:
        transformers.append(
            (
                "num",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                    ]
                ),
                numeric,
            )
        )

    if categorical:
        transformers.append(
            (
                "cat",
                Pipeline(
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
                ),
                categorical,
            )
        )

    pre = ColumnTransformer(
        transformers,
        remainder="drop",
    )

    return Pipeline(
        [
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
        ]
    )


def evaluate(df, rate_column, label):
    if rate_column is None:
        features = BASE_FEATURES
    else:
        features = BASE_FEATURES + [rate_column]

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

    overall = []
    by_lang = {"en": [], "hi": [], "ta": []}

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

        auc = roc_auc_score(
            test["label"],
            probabilities,
        )

        overall.append(auc)

        for language in by_lang:
            mask = test["language"] == language

            by_lang[language].append(
                roc_auc_score(
                    test.loc[mask, "label"],
                    probabilities[mask],
                )
            )

        print(
            f"{label:28s} "
            f"fold {fold}: "
            f"overall={auc:.4f} "
            f"en={by_lang['en'][-1]:.4f} "
            f"hi={by_lang['hi'][-1]:.4f} "
            f"ta={by_lang['ta'][-1]:.4f}"
        )

    print(
        f"\n{label:28s} SUMMARY "
        f"overall={np.mean(overall):.4f} +/- {np.std(overall):.4f} "
        f"en={np.mean(by_lang['en']):.4f} +/- {np.std(by_lang['en']):.4f} "
        f"hi={np.mean(by_lang['hi']):.4f} +/- {np.std(by_lang['hi']):.4f} "
        f"ta={np.mean(by_lang['ta']):.4f} +/- {np.std(by_lang['ta']):.4f}"
    )

    return {
        "model": label,
        "overall": np.mean(overall),
        "overall_std": np.std(overall),
        "en": np.mean(by_lang["en"]),
        "hi": np.mean(by_lang["hi"]),
        "ta": np.mean(by_lang["ta"]),
    }


def main():
    df = pd.read_csv(DATA)

    print(f"Loaded {len(df)} rows")

    print("\nCalculating corrected pitch-change rate...")
    print("This may take a few minutes because it re-reads the WAV files.")

    df["pitch_change_rate_corrected"] = df["file"].apply(
        corrected_pitch_change_rate
    )

    print("\nCorrected feature summary:")
    print(
        df["pitch_change_rate_corrected"]
        .describe()
        .to_string()
    )

    print("\nExisting feature summary:")
    print(
        df["pitch_change_rate"]
        .describe()
        .to_string()
    )

    valid = (
        df["pitch_change_rate"].notna()
        & df["pitch_change_rate_corrected"].notna()
    )

    if valid.any():
        correlation = np.corrcoef(
            df.loc[valid, "pitch_change_rate"],
            df.loc[valid, "pitch_change_rate_corrected"],
        )[0, 1]

        print(
            f"\nCorrelation old vs corrected: {correlation:.4f}"
        )

        difference = (
            df.loc[valid, "pitch_change_rate_corrected"]
            - df.loc[valid, "pitch_change_rate"]
        )

        print(
            f"Mean corrected-old difference: {difference.mean():.5f}"
        )

        print(
            f"Mean absolute difference: {difference.abs().mean():.5f}"
        )

    df.to_csv(
        "reports/prosody_pitch_change_comparison.csv",
        index=False,
    )

    print("\n" + "=" * 78)
    print("HGB PITCH-CHANGE-RATE COMPARISON")
    print("=" * 78)

    results = []

    results.append(
        evaluate(
            df,
            "pitch_change_rate",
            "OLD_RATE",
        )
    )

    results.append(
        evaluate(
            df,
            "pitch_change_rate_corrected",
            "CORRECTED_RATE",
        )
    )

    results.append(
        evaluate(
            df,
            None,
            "NO_RATE_CONTROL",
        )
    )

    result_df = pd.DataFrame(results)

    print("\n" + "=" * 78)
    print("FINAL COMPARISON")
    print("=" * 78)

    print(
        result_df.to_string(
            index=False,
            float_format=lambda x: f"{x:.4f}",
        )
    )

    result_df.to_csv(
        "reports/hgb_pitch_change_comparison.csv",
        index=False,
    )

    print("\nWrote:")
    print("  reports/prosody_pitch_change_comparison.csv")
    print("  reports/hgb_pitch_change_comparison.csv")


if __name__ == "__main__":
    main()
