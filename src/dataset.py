import io
import os
import soundfile as sf
import numpy as np
from datasets import load_dataset
from tqdm import tqdm

RAW_DIR = "data/raw"

def write_audio(data, sr, category: str, lang: str, speaker_id: str, idx: int):
    """Safely saves audio numpy arrays or raw byte streams to disk."""
    dir_name = f"{category}_{lang}"
    out_dir = os.path.join(RAW_DIR, dir_name, str(speaker_id))
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{dir_name}_{idx}.wav")

    if isinstance(data, np.ndarray):
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        sf.write(out_path, data.astype(np.float32), sr)
    elif isinstance(data, bytes):
        with io.BytesIO(data) as bio:
            arr, file_sr = sf.read(bio)
        if arr.ndim > 1:
            arr = np.mean(arr, axis=1)
        sf.write(out_path, arr.astype(np.float32), file_sr)

def download_dataset(samples_per_bucket: int = 150):
    print("=== Downloading 4-Quadrant Accent-Balanced Audio Dataset ===")
    
    half_bucket = samples_per_bucket // 2  # 75 clips per sub-accent

    # -------------------------------------------------------------
    # 1. REAL ENGLISH (bonafide_en, Label = 0)
    # 50% Indian English + 50% Western English
    # -------------------------------------------------------------
    print("\n1. Fetching Real English (50% Indian + 50% Western)...")
    count_en_real = 0

    # Part 1A: Indian Real English (Svarah / Common Voice)
    try:
        ds_svarah = load_dataset("ai4bharat/Svarah", split="test", streaming=True)
        for item in tqdm(ds_svarah, total=half_bucket, desc="Real Indic-EN"):
            audio_obj = item.get("audio_filepath") or item.get("audio") or item.get("audio_file") or item.get("audio_data")
            if isinstance(audio_obj, dict):
                spk = f"svarah_{item.get('speaker_id', count_en_real % 20)}"
                if "bytes" in audio_obj and audio_obj["bytes"]:
                    write_audio(audio_obj["bytes"], None, "bonafide", "en", spk, count_en_real)
                    count_en_real += 1
                elif "array" in audio_obj and audio_obj["array"] is not None:
                    write_audio(audio_obj["array"], audio_obj["sampling_rate"], "bonafide", "en", spk, count_en_real)
                    count_en_real += 1
            if count_en_real >= half_bucket:
                break
    except Exception as e:
        print(f"Svarah note: {e}")

    if count_en_real < half_bucket:
        try:
            ds_cv = load_dataset("ishands/commonvoice-indian_accent", split="train", streaming=True)
            for item in tqdm(ds_cv, total=half_bucket - count_en_real, desc="CV Indic-EN"):
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = item.get("client_id", f"cv_en_{count_en_real % 20}")[:12]
                write_audio(arr, sr, "bonafide", "en", spk, count_en_real)
                count_en_real += 1
                if count_en_real >= half_bucket:
                    break
        except Exception as cv_err:
            print(f"CommonVoice note: {cv_err}")

    # Part 1B: Western Real English (Gary Stafford bona fide)
    west_real_count = 0
    try:
        ds_west_real = load_dataset("garystafford/deepfake-audio-detection", split="train", streaming=True)
        for item in tqdm(ds_west_real, total=samples_per_bucket - count_en_real, desc="Real West-EN"):
            if item.get("label", 1) == 0:
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = f"west_real_{west_real_count % 15}"
                write_audio(arr, sr, "bonafide", "en", spk, count_en_real)
                count_en_real += 1
                west_real_count += 1
                if count_en_real >= samples_per_bucket:
                    break
    except Exception as e:
        print(f"Error fetching Real Western English: {e}")

    # -------------------------------------------------------------
    # 2. FAKE ENGLISH (spoof_en, Label = 1)
    # 50% Cloned Indian English + 50% Cloned Western English
    # -------------------------------------------------------------
    print("\n2. Fetching Fake English (50% Indian Clones + 50% Western Clones)...")
    count_en_fake = 0

    # Part 2A: Indian Synthetic English (IndicTTS Deepfake Challenge)
    try:
        ds_indic_fake = load_dataset("SherryT997/IndicTTS-Deepfake-Challenge-Data", split="train", streaming=True)
        for item in tqdm(ds_indic_fake, total=half_bucket, desc="Spoof Indic-EN"):
            lang = str(item.get("language", "")).lower()
            is_tts = item.get("is_tts", item.get("label", 0))
            if "english" in lang and is_tts == 1:
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = f"indic_synth_en_{count_en_fake % 15}"
                write_audio(arr, sr, "spoof", "en", spk, count_en_fake)
                count_en_fake += 1
                if count_en_fake >= half_bucket:
                    break
    except Exception as e:
        print(f"IndicTTS English fallback note: {e}")

    # Fallback to bilingual Indic TTS if needed
    if count_en_fake < half_bucket:
        try:
            ds_bilingual = load_dataset("nameissakthi/hindi-english-bilingual", split="train", streaming=True)
            for item in tqdm(ds_bilingual, total=half_bucket - count_en_fake, desc="Bilingual Indic-EN"):
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = f"indic_bilingual_{count_en_fake % 15}"
                write_audio(arr, sr, "spoof", "en", spk, count_en_fake)
                count_en_fake += 1
                if count_en_fake >= half_bucket:
                    break
        except Exception as bi_err:
            print(f"Bilingual note: {bi_err}")

    # Part 2B: Western Synthetic English (ElevenLabs, Amazon Polly, Speechify)
    west_fake_count = 0
    try:
        ds_west_fake = load_dataset("garystafford/deepfake-audio-detection", split="train", streaming=True)
        for item in tqdm(ds_west_fake, total=samples_per_bucket - count_en_fake, desc="Spoof West-EN"):
            if item.get("label", 0) == 1:
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = f"west_synth_{west_fake_count % 15}"
                write_audio(arr, sr, "spoof", "en", spk, count_en_fake)
                count_en_fake += 1
                west_fake_count += 1
                if count_en_fake >= samples_per_bucket:
                    break
    except Exception as e:
        print(f"Error fetching Fake Western English: {e}")

    # -------------------------------------------------------------
    # 3. REAL HINDI (bonafide_hi, Label = 0)
    # Strictly filtered for native Hindi speech (is_tts == 0)
    # -------------------------------------------------------------
    print("\n3. Fetching Verified Real Hindi Speech...")
    count_hi_real = 0
    try:
        ds_indic_hi = load_dataset("SherryT997/IndicTTS-Deepfake-Challenge-Data", split="train", streaming=True)
        for item in tqdm(ds_indic_hi, total=samples_per_bucket, desc="Real-HI"):
            lang = str(item.get("language", "")).lower()
            is_tts = item.get("is_tts", item.get("label", 0))
            if "hindi" in lang and is_tts == 0:
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = f"real_hi_{count_hi_real % 20}"
                write_audio(arr, sr, "bonafide", "hi", spk, count_hi_real)
                count_hi_real += 1
                if count_hi_real >= samples_per_bucket:
                    break
    except Exception as e:
        print(f"Error fetching Real Hindi: {e}")

    # -------------------------------------------------------------
    # 4. FAKE HINDI (spoof_hi, Label = 1)
    # Strictly filtered for synthetic Hindi speech (is_tts == 1)
    # -------------------------------------------------------------
    print("\n4. Fetching Diverse Synthetic Hindi Speech...")
    count_hi_fake = 0
    try:
        ds_indic_fake_hi = load_dataset("SherryT997/IndicTTS-Deepfake-Challenge-Data", split="train", streaming=True)
        for item in tqdm(ds_indic_fake_hi, total=samples_per_bucket, desc="Spoof-HI"):
            lang = str(item.get("language", "")).lower()
            is_tts = item.get("is_tts", item.get("label", 1))
            if "hindi" in lang and is_tts == 1:
                arr = item["audio"]["array"]
                sr = item["audio"]["sampling_rate"]
                spk = f"synth_hi_{count_hi_fake % 20}"
                write_audio(arr, sr, "spoof", "hi", spk, count_hi_fake)
                count_hi_fake += 1
                if count_hi_fake >= samples_per_bucket:
                    break
    except Exception as e:
        print(f"Error fetching Fake Hindi: {e}")

    print("\nBalanced dataset ingestion complete. Samples stored in data/raw/")

if __name__ == "__main__":
    download_dataset(samples_per_bucket=150)
