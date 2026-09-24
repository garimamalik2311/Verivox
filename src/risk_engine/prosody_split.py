from pathlib import Path

import numpy as np
import pandas as pd


INPUT_PATH = Path("reports/prosody_dataset.csv")
OUTPUT_PATH = Path("reports/prosody_dataset_split.csv")

RANDOM_SEED = 42
TRAIN_RATIO = 0.70


def main() -> None:
    df = pd.read_csv(INPUT_PATH)

    rng = np.random.default_rng(RANDOM_SEED)

    assignments = []

    for (language, label), subset in df.groupby(
        ["language", "label"],
        sort=True,
    ):
        groups = np.array(sorted(subset["group"].unique()), dtype=object)

        rng.shuffle(groups)

        train_count = int(len(groups) * TRAIN_RATIO)

        train_groups = set(groups[:train_count])
        test_groups = set(groups[train_count:])

        for group in train_groups:
            assignments.append({
                "language": language,
                "label": label,
                "group": group,
                "split": "train",
            })

        for group in test_groups:
            assignments.append({
                "language": language,
                "label": label,
                "group": group,
                "split": "test",
            })

    split_df = pd.DataFrame(assignments)

    df = df.drop(columns=["split"], errors="ignore")

    df = df.merge(
        split_df,
        on=["language", "label", "group"],
        how="left",
        validate="many_to_one",
    )

    if df["split"].isna().any():
        raise RuntimeError("Some recordings were not assigned to a split")

    # Verify that no group appears in both splits.
    group_split_counts = (
        df.groupby(["language", "label", "group"])["split"]
        .nunique()
    )

    leaked_groups = group_split_counts[
        group_split_counts > 1
    ]

    if not leaked_groups.empty:
        raise RuntimeError(
            f"Group leakage detected:\n{leaked_groups}"
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"Saved: {OUTPUT_PATH}")
    print(f"Rows: {len(df)}")

    print()
    print("=== Recording counts ===")
    print(
        df.groupby(["split", "language", "label"])
          .size()
    )

    print()
    print("=== Group counts ===")
    print(
        df.groupby(["split", "language", "label"])["group"]
          .nunique()
    )

    print()
    print("=== Leakage check ===")
    print("PASS: no group appears in both train and test")


if __name__ == "__main__":
    main()
