import os
import numpy as np
import pandas as pd
import librosa
from tqdm import tqdm
from sklearn.model_selection import GroupShuffleSplit
from src.config import SAMPLE_RATE, WINDOW_STRIDE_SAMPLES, WINDOW_SIZE_SAMPLES
from src.features import extract_features

def slice_and_extract(filepath: str):
    try:
        y, _ = librosa.load(filepath, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        print(f"Skipping corrupt audio {filepath}: {e}")
        return []

    if len(y) < WINDOW_SIZE_SAMPLES:
        return []

    features = []
    for start in range(0, len(y) - WINDOW_SIZE_SAMPLES + 1, WINDOW_STRIDE_SAMPLES):
        window = y[start:start + WINDOW_SIZE_SAMPLES]
        features.append(extract_features(window))
    return features

def generate_splits(manifest_path: str = "data/processed/manifest.csv"):
    if not os.path.exists(manifest_path):
        print(f"Manifest {manifest_path} not found. Run dataset_indexer.py first.")
        return

    df = pd.read_csv(manifest_path)
    if len(df) == 0:
        print("Manifest is empty. Add audio files to data/raw/")
        return

    # 80/20 Speaker-Disjoint Split
    gss = GroupShuffleSplit(n_splits=1, train_size=0.8, random_state=42)
    train_idx, val_idx = next(gss.split(df, groups=df['speaker_id']))

    splits = {
        'train': df.iloc[train_idx],
        'val': df.iloc[val_idx]
    }

    # Verify zero speaker overlap
    overlap = set(splits['train']['speaker_id']).intersection(set(splits['val']['speaker_id']))
    assert len(overlap) == 0, f"Speaker leakage detected: {overlap}"

    for split_name, split_df in splits.items():
        X, y = [], []
        print(f"\nExtracting features for {split_name} split ({len(split_df)} files)...")
        for _, row in tqdm(split_df.iterrows(), total=len(split_df)):
            window_feats = slice_and_extract(row['filepath'])
            for feat in window_feats:
                X.append(feat)
                y.append(row['label'])

        np.save(f"data/processed/X_{split_name}.npy", np.array(X, dtype=np.float32))
        np.save(f"data/processed/y_{split_name}.npy", np.array(y, dtype=np.int64))

    # Fast iteration test set (first 100 samples)
    if os.path.exists("data/processed/X_val.npy") and len(np.load("data/processed/X_val.npy")) > 0:
        X_val = np.load("data/processed/X_val.npy")
        y_val = np.load("data/processed/y_val.npy")
        np.save("data/processed/X_test_mini.npy", X_val[:100])
        np.save("data/processed/y_test_mini.npy", y_val[:100])
        print("\nPre-cached X_train.npy, y_train.npy, X_val.npy, and mini-test sets.")

if __name__ == "__main__":
    generate_splits()