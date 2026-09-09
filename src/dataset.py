import io
import os
import soundfile as sf
from datasets import Audio, load_dataset
from tqdm import tqdm

RAW_DIR = "data/raw"

def save_clip(audio_bytes, category, speaker_id, idx):
    out_dir = os.path.join(RAW_DIR, category, str(speaker_id))
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{category}_{idx}.wav")
    with io.BytesIO(audio_bytes) as bio:
        data, sr = sf.read(bio)
    sf.write(out_path, data, sr)

def download_multilingual_datasets(samples_per_category: int = 50):
    print("=== Downloading Indic Datasets (Free & Open Source) ===")

    # 1. Authentic Indian Accents (Mozilla Common Voice)
    print("\n1. Streaming Indian English (ishands/commonvoice-indian_accent)...")
    try:
        ds_en = load_dataset("ishands/commonvoice-indian_accent", split="train", streaming=True)
        ds_en = ds_en.cast_column("audio", Audio(decode=False))
        count = 0
        for item in tqdm(ds_en, total=samples_per_category):
            audio_bytes = item["audio"]["bytes"]
            spk = item.get("client_id", f"spk_en_{count % 10}")[:12]
            save_clip(audio_bytes, "bonafide_en", spk, count)
            count += 1
            if count >= samples_per_category:
                break
    except Exception as e:
        print(f"Skipping Indian English: {e}")

    # 2. Synthetic & Cloned Indic Speech (vdivyasharma/IndicSynth Hindi subset)
    print("\n2. Streaming Synthetic Hindi Clones (vdivyasharma/IndicSynth)...")
    try:
        ds_synth = load_dataset("vdivyasharma/IndicSynth", name="Hindi", split="train", streaming=True)
        ds_synth = ds_synth.cast_column("audio", Audio(decode=False))
        count = 0
        for item in tqdm(ds_synth, total=samples_per_category):
            audio_bytes = item["audio"]["bytes"]
            spk = f"synth_indic_{count % 10}"
            save_clip(audio_bytes, "spoof_indic", spk, count)
            count += 1
            if count >= samples_per_category:
                break
    except Exception as e:
        print(f"Skipping Synthetic Indic: {e}")

    print("\nDownload finished. Files saved under data/raw/")

if __name__ == "__main__":
    download_multilingual_datasets(samples_per_category=50)
