import os
import pandas as pd

def parse_language(path_str: str) -> str:
    """Infers language from path/directory names."""
    p = path_str.lower()
    if any(tag in p for tag in ["_hi", "/hi", "hindi", "_indic"]):
        return "hi"
    elif any(tag in p for tag in ["_en", "/en", "english", "svarah"]):
        return "en"
    elif any(tag in p for tag in ["hinglish", "bilingual"]):
        return "hinglish"
    return "unknown"

def build_manifest(raw_dir: str = "data/raw", output_csv: str = "data/processed/manifest.csv") -> pd.DataFrame:
    records = []
    supported_exts = ('.wav', '.mp3', '.flac', '.ogg', '.m4a')

    for root, _, files in os.walk(raw_dir):
        for file in files:
            if file.lower().endswith(supported_exts):
                full_path = os.path.join(root, file)

                # Label: 1 for spoof/synth, 0 for bona fide
                label = 1 if any(tag in full_path.lower() for tag in ['spoof', 'fake', 'synth']) else 0

                # Language tag
                language = parse_language(full_path)

                # Speaker ID from parent folder
                speaker_id = os.path.basename(root)

                records.append({
                    "filepath": full_path,
                    "speaker_id": speaker_id,
                    "language": language,
                    "label": label
                })

    df = pd.DataFrame(records)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    
    print(f"Indexed {len(df)} files into {output_csv}")
    if not df.empty and "language" in df.columns:
        print("\n=== Dataset Distribution Matrix ===")
        print(pd.crosstab(df["language"], df["label"], margins=True))

    return df

if __name__ == "__main__":
    build_manifest()
