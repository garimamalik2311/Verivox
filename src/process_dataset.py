import os
import numpy as np
import pandas as pd
import librosa
from sklearn.model_selection import StratifiedGroupKFold
from tqdm import tqdm
from src.features import extract_features
from src.config import SAMPLE_RATE, WINDOW_STRIDE_SAMPLES

def slice_and_extract(filepath: str):
    """Loads audio and extracts 30-D features from 1-second sliding windows."""
    try:
        y, _ = librosa.load(filepath, sr=SAMPLE_RATE, mono=True)
    except Exception:
        return []
    if len(y) < SAMPLE_RATE:
        return []
    
    feats = []
    # 1s window (SAMPLE_RATE samples) with stride (WINDOW_STRIDE_SAMPLES = 8,000 samples)
    for start in range(0, len(y) - SAMPLE_RATE + 1, WINDOW_STRIDE_SAMPLES):
        chunk = y[start:start + SAMPLE_RATE]
        feats.append(extract_features(chunk))
    return feats

def run(manifest_csv: str = "data/processed/manifest.csv"):
    df = pd.read_csv(manifest_csv)

    # Balance across both language ('en', 'hi') and label (0, 1)
    df["strat_key"] = df["label"].astype(str) + "_" + df["language"].astype(str)

    # 1. Carve out a ~15% holdout test set (stratified + speaker-disjoint)
    sgkf_test = StratifiedGroupKFold(n_splits=7, shuffle=True, random_state=42)
    train_val_idx, test_idx = next(sgkf_test.split(df, y=df["strat_key"], groups=df["speaker_id"]))
    
    train_val_df = df.iloc[train_val_idx].reset_index(drop=True)
    test_df = df.iloc[test_idx].reset_index(drop=True)

    # 2. Split remainder into Train (~70%) and Val (~15%)
    sgkf_val = StratifiedGroupKFold(n_splits=6, shuffle=True, random_state=42)
    train_idx, val_idx = next(sgkf_val.split(train_val_df, y=train_val_df["strat_key"], groups=train_val_df["speaker_id"]))
    
    train_df = train_val_df.iloc[train_idx].reset_index(drop=True)
    val_df = train_val_df.iloc[val_idx].reset_index(drop=True)

    # Sanity check: zero speaker leakage across splits
    spk_train = set(train_df['speaker_id'])
    spk_val = set(val_df['speaker_id'])
    spk_test = set(test_df['speaker_id'])
    assert len(spk_train & spk_val) == 0, "Speaker leakage between Train and Val!"
    assert len(spk_train & spk_test) == 0, "Speaker leakage between Train and Test!"
    assert len(spk_val & spk_test) == 0, "Speaker leakage between Val and Test!"

    splits = [("train", train_df), ("val", val_df), ("test", test_df)]
    for name, split_df in splits:
        X, y = [], []
        print(f"\nProcessing {name} split ({len(split_df)} files)...")
        for _, row in tqdm(split_df.iterrows(), total=len(split_df)):
            windows = slice_and_extract(row["filepath"])
            for vec in windows:
                X.append(vec)
                y.append(row["label"])
        
        X_arr = np.array(X, dtype=np.float32)
        y_arr = np.array(y, dtype=np.int64)
        np.save(f"data/processed/X_{name}.npy", X_arr)
        np.save(f"data/processed/y_{name}.npy", y_arr)
        print(f"Saved {name}: {X_arr.shape} windows, Balance (0:Real, 1:Fake): {np.bincount(y_arr)}")

    # Backward compatibility: save 100-sample mini slice for quick iteration
    X_test = np.load("data/processed/X_test.npy")
    y_test = np.load("data/processed/y_test.npy")
    np.save("data/processed/X_test_mini.npy", X_test[:100])
    np.save("data/processed/y_test_mini.npy", y_test[:100])
    print("\nAll arrays successfully pre-cached in data/processed/")

if __name__ == "__main__":
    run()