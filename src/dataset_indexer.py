import os
import pandas as pd

def build_manifest(raw_dir: str = "data/raw", output_csv: str = "data/processed/manifest.csv") -> pd.DataFrame:
    records = []
    supported_exts = ('.wav', '.mp3', '.flac', '.ogg', '.m4a')

    for root, _, files in os.walk(raw_dir):
        for file in files:
            if file.lower().endswith(supported_exts):
                full_path = os.path.join(root, file)
                # Convention: Spoofed files typically have 'spoof', 'fake', or specific protocol tags
                label = 1 if any(tag in full_path.lower() for tag in ['spoof', 'fake', 'synth']) else 0
                
                # Derive speaker ID from parent directory name or file prefix
                speaker_id = os.path.basename(root)

                records.append({
                    "filepath": full_path,
                    "speaker_id": speaker_id,
                    "label": label
                })

    df = pd.DataFrame(records)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"Indexed {len(df)} files into {output_csv}")
    return df

if __name__ == "__main__":
    build_manifest()
