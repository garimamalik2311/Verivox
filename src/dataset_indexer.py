import os
import re
import glob
import pandas as pd
from pathlib import Path

RAW_DIR = Path("data/raw")
OUTPUT_CSV = Path("data/processed/manifest.csv")

def parse_language(path_str: str) -> str:
    """Infers language code (en, hi, ta) from path or folder names."""
    p = path_str.lower()
    if any(tag in p for tag in ["_ta", "/ta", "tamil", "indicvoices"]):
        return "ta"
    elif any(tag in p for tag in ["_hi", "/hi", "hindi", "indictts"]):
        return "hi"
    elif any(tag in p for tag in ["_en", "/en", "english", "svarah", "gary", "west"]):
        return "en"
    return "unknown"

def parse_label(path_str: str) -> int:
    """Infers label: 1 for spoof/fake/synthetic, 0 for bona fide/real."""
    p = path_str.lower()
    if any(tag in p for tag in ["spoof", "fake", "synth", "tts"]):
        return 1
    return 0

def extract_speaker_id(full_path: str, root_dir: str) -> str:
    """
    Extracts the speaker_id from the subfolder structure or file prefix.
    Supports subdirectories like data/raw/bonafide_en/svarah_0/file.wav -> svarah_0
    """
    rel_path = os.path.relpath(full_path, root_dir)
    parts = rel_path.split(os.sep)

    # If file is nested inside bucket/speaker_dir/file.wav
    if len(parts) >= 3:
        return parts[1]

    # Fallback to extracting from filename prefix
    filename = parts[-1]
    match = re.match(r"^([a-zA-Z0-9]+_[a-zA-Z0-9]+)_", filename)
    if match:
        return match.group(1)

    return parts[0]  # Fallback to bucket name if no speaker subfolder exists

def build_manifest(raw_dir: str = "data/raw", output_csv: str = "data/processed/manifest.csv") -> pd.DataFrame:
    records = []
    supported_exts = ('.wav', '.mp3', '.flac', '.ogg', '.m4a')

    raw_path = Path(raw_dir)
    if not raw_path.exists():
        print(f"Error: Raw directory '{raw_dir}' does not exist.")
        return pd.DataFrame()

    for root, _, files in os.walk(raw_dir):
        for file in files:
            if file.lower().endswith(supported_exts):
                full_path = os.path.join(root, file)

                label = parse_label(full_path)
                language = parse_language(full_path)
                speaker_id = extract_speaker_id(full_path, raw_dir)

                records.append({
                    "filepath": full_path,
                    "speaker_id": speaker_id,
                    "language": language,
                    "label": label
                })

    df = pd.DataFrame(records)

    if df.empty:
        print("Warning: No audio files found in data/raw/")
        return df

    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)

    print(f"Indexed {len(df)} files into {output_csv}")
    print("\n=== Dataset Distribution Matrix ===")
    print(pd.crosstab(df["language"], df["label"], margins=True))

    return df

if __name__ == "__main__":
    build_manifest()