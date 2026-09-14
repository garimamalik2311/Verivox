
# ================================================================
# FFmpeg DLL SETUP
# IMPORTANT: This MUST come before importing `datasets`
# ================================================================

import os

FFMPEG_BIN = (
    r"C:\Users\Jaanvi\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.1-full_build-shared\bin"
)

if os.path.isdir(FFMPEG_BIN):
    os.add_dll_directory(FFMPEG_BIN)

    os.environ["PATH"] = (
        FFMPEG_BIN
        + os.pathsep
        + os.environ.get("PATH", "")
    )

    print(
        f"FFmpeg DLL directory added: {FFMPEG_BIN}"
    )
else:
    print(
        f"WARNING: FFmpeg DLL directory not found: "
        f"{FFMPEG_BIN}"
    )


# ================================================================
# IMPORTS
# ================================================================

import io

import soundfile as sf
import numpy as np

from datasets import load_dataset
from tqdm import tqdm


# ================================================================
# CONFIG
# ================================================================

RAW_DIR = "data/raw"


# ================================================================
# AUDIO WRITER
# ================================================================

def write_audio(
    data,
    sr,
    category: str,
    lang: str,
    speaker_id: str,
    idx: int,
):
    """
    Safely saves audio numpy arrays or raw byte streams to disk.
    """

    dir_name = f"{category}_{lang}"

    out_dir = os.path.join(
        RAW_DIR,
        dir_name,
        str(speaker_id),
    )

    os.makedirs(
        out_dir,
        exist_ok=True,
    )

    out_path = os.path.join(
        out_dir,
        f"{dir_name}_{idx}.wav",
    )

    try:

        # --------------------------------------------------------
        # NumPy audio array
        # --------------------------------------------------------

        if isinstance(data, np.ndarray):

            if data.ndim > 1:
                data = np.mean(
                    data,
                    axis=1,
                )

            if sr is None:
                sr = 16000

            sf.write(
                out_path,
                data.astype(np.float32),
                sr,
            )

            return True

        # --------------------------------------------------------
        # Raw audio bytes
        # --------------------------------------------------------

        elif isinstance(data, bytes):

            with io.BytesIO(data) as bio:

                arr, file_sr = sf.read(bio)

            if arr.ndim > 1:
                arr = np.mean(
                    arr,
                    axis=1,
                )

            sf.write(
                out_path,
                arr.astype(np.float32),
                file_sr,
            )

            return True

    except Exception as e:

        print(
            f"Audio write error for {out_path}: {e}"
        )

    return False


# ================================================================
# HELPER: EXTRACT AUDIO FROM HF DATASET ITEM
# ================================================================

def get_audio_from_item(item):
    """
    Safely extracts audio from a Hugging Face dataset item.

    Supports:
        - {"array": ..., "sampling_rate": ...}
        - {"bytes": ...}
        - raw bytes
    """

    audio_obj = None

    # Do NOT use:
    # item.get("audio") or item.get("audio_file")
    #
    # because NumPy arrays can trigger:
    # "The truth value of an array is ambiguous"

    possible_keys = [
        "audio_filepath",
        "audio",
        "audio_file",
        "audio_data",
    ]

    for key in possible_keys:

        if key in item:

            value = item[key]

            if value is not None:
                audio_obj = value
                break

    if audio_obj is None:
        return None, None


    # ------------------------------------------------------------
    # Audio dictionary
    # ------------------------------------------------------------

    if isinstance(audio_obj, dict):

        # Decoded NumPy array
        if (
            "array" in audio_obj
            and audio_obj["array"] is not None
        ):

            return (
                np.asarray(
                    audio_obj["array"]
                ),
                audio_obj.get(
                    "sampling_rate",
                    16000,
                ),
            )

        # Raw bytes
        if (
            "bytes" in audio_obj
            and audio_obj["bytes"]
        ):

            return (
                audio_obj["bytes"],
                None,
            )


    # ------------------------------------------------------------
    # Raw bytes
    # ------------------------------------------------------------

    if isinstance(
        audio_obj,
        bytes,
    ):

        return (
            audio_obj,
            None,
        )


    return None, None


# ================================================================
# MAIN DATASET DOWNLOAD FUNCTION
# ================================================================

def download_dataset(
    samples_per_bucket: int = 150
):

    print(
        "================================================================="
    )
    print(
        "=== Downloading 4-Quadrant Accent-Balanced Audio Dataset ==="
    )
    print(
        "================================================================="
    )

    half_bucket = (
        samples_per_bucket // 2
    )


    # ============================================================
    # 1. REAL ENGLISH
    # bonafide_en
    # Label = 0
    #
    # 50% Indian English
    # 50% Western English
    # ============================================================

    print(
        "\n1. Fetching Real English "
        "(50% Indian + 50% Western)..."
    )

    count_en_real = 0


    # ------------------------------------------------------------
    # 1A. Indian Real English
    # Svarah
    # ------------------------------------------------------------

    try:

        print(
            "\nTrying Svarah..."
        )

        ds_svarah = load_dataset(
            "ai4bharat/Svarah",
            split="test",
            streaming=True,
        )

        for item in tqdm(
            ds_svarah,
            total=half_bucket,
            desc="Real Indic-EN",
        ):

            if count_en_real >= half_bucket:
                break

            try:

                data, sr = (
                    get_audio_from_item(item)
                )

                if data is None:
                    continue

                speaker = item.get(
                    "speaker_id",
                    f"svarah_{count_en_real % 20}",
                )

                spk = (
                    f"svarah_{speaker}"
                )[:30]

                if write_audio(
                    data,
                    sr,
                    "bonafide",
                    "en",
                    spk,
                    count_en_real,
                ):

                    count_en_real += 1

            except Exception:
                continue

        print(
            f"Svarah provided "
            f"{count_en_real} samples."
        )

    except Exception as e:

        print(
            f"Svarah note: {e}"
        )


    # ------------------------------------------------------------
    # 1A FALLBACK. Common Voice Indian Accent
    # ------------------------------------------------------------

    if count_en_real < half_bucket:

        try:

            remaining = (
                half_bucket
                - count_en_real
            )

            print(
                f"Trying Common Voice "
                f"for {remaining} more..."
            )

            ds_cv = load_dataset(
                "ishands/commonvoice-indian_accent",
                split="train",
                streaming=True,
            )

            scanned = 0

            max_scan = max(
                remaining * 20,
                200,
            )

            for item in tqdm(
                ds_cv,
                total=max_scan,
                desc="CV Indic-EN",
            ):

                if count_en_real >= half_bucket:
                    break

                if scanned >= max_scan:

                    print(
                        f"\nStopped Common Voice "
                        f"after scanning "
                        f"{scanned} samples."
                    )

                    break

                scanned += 1

                try:

                    data, sr = (
                        get_audio_from_item(item)
                    )

                    if data is None:
                        continue

                    speaker = item.get(
                        "client_id",
                        f"cv_en_{count_en_real % 20}",
                    )

                    spk = str(
                        speaker
                    )[:30]

                    if write_audio(
                        data,
                        sr,
                        "bonafide",
                        "en",
                        spk,
                        count_en_real,
                    ):

                        count_en_real += 1

                except Exception:
                    continue

            print(
                f"Common Voice collected "
                f"{count_en_real} "
                f"Indian-English samples."
            )

        except Exception as e:

            print(
                f"CommonVoice note: {e}"
            )


    # ------------------------------------------------------------
    # 1B. Western Real English
    # Gary Stafford
    # Label 0 = bona fide
    # ------------------------------------------------------------

    west_real_count = 0

    try:

        print(
            "\nFetching Western real-English samples..."
        )

        ds_west_real = load_dataset(
            "garystafford/deepfake-audio-detection",
            split="train",
            streaming=True,
        )

        target_west_real = (
            samples_per_bucket
            - count_en_real
        )

        for item in tqdm(
            ds_west_real,
            total=target_west_real,
            desc="Real West-EN",
        ):

            if count_en_real >= samples_per_bucket:
                break

            try:

                label = item.get(
                    "label",
                    1,
                )

                if label != 0:
                    continue

                data, sr = (
                    get_audio_from_item(item)
                )

                if data is None:
                    continue

                spk = (
                    f"west_real_"
                    f"{west_real_count % 15}"
                )

                if write_audio(
                    data,
                    sr,
                    "bonafide",
                    "en",
                    spk,
                    count_en_real,
                ):

                    count_en_real += 1
                    west_real_count += 1

            except Exception:
                continue

    except Exception as e:

        print(
            f"Error fetching "
            f"Real Western English: {e}"
        )


    # ============================================================
    # 2. FAKE ENGLISH
    # spoof_en
    # Label = 1
    #
    # 50% Indian synthetic English
    # 50% Western synthetic English
    # ============================================================

    print(
        "\n2. Fetching Fake English "
        "(50% Indian Clones + 50% Western Clones)..."
    )

    count_en_fake = 0


    # ------------------------------------------------------------
    # 2A. Indian Synthetic English
    # IndicTTS Deepfake Challenge
    # ------------------------------------------------------------

    try:

        ds_indic_fake = load_dataset(
            "SherryT997/IndicTTS-Deepfake-Challenge-Data",
            split="train",
            streaming=True,
        )

        for item in tqdm(
            ds_indic_fake,
            total=half_bucket,
            desc="Spoof Indic-EN",
        ):

            if count_en_fake >= half_bucket:
                break

            try:

                lang = str(
                    item.get(
                        "language",
                        "",
                    )
                ).lower()

                is_tts = item.get(
                    "is_tts",
                    item.get(
                        "label",
                        0,
                    ),
                )

                if (
                    "english" in lang
                    and is_tts == 1
                ):

                    data, sr = (
                        get_audio_from_item(item)
                    )

                    if data is None:
                        continue

                    spk = (
                        f"indic_synth_en_"
                        f"{count_en_fake % 15}"
                    )

                    if write_audio(
                        data,
                        sr,
                        "spoof",
                        "en",
                        spk,
                        count_en_fake,
                    ):

                        count_en_fake += 1

            except Exception:
                continue

    except Exception as e:

        print(
            f"IndicTTS English note: {e}"
        )


    # ------------------------------------------------------------
    # IMPORTANT:
    # We do NOT use the bilingual dataset as fake audio.
    #
    # A bilingual dataset is not automatically synthetic.
    # Therefore it should not be mislabeled as spoof/fake.
    # ------------------------------------------------------------


    # ------------------------------------------------------------
    # 2B. Western Synthetic English
    # Gary Stafford
    # Label 1 = fake
    # ------------------------------------------------------------

    west_fake_count = 0

    try:

        ds_west_fake = load_dataset(
            "garystafford/deepfake-audio-detection",
            split="train",
            streaming=True,
        )

        target_west_fake = (
            samples_per_bucket
            - count_en_fake
        )

        for item in tqdm(
            ds_west_fake,
            total=target_west_fake,
            desc="Spoof West-EN",
        ):

            if count_en_fake >= samples_per_bucket:
                break

            try:

                label = item.get(
                    "label",
                    0,
                )

                if label != 1:
                    continue

                data, sr = (
                    get_audio_from_item(item)
                )

                if data is None:
                    continue

                spk = (
                    f"west_synth_"
                    f"{west_fake_count % 15}"
                )

                if write_audio(
                    data,
                    sr,
                    "spoof",
                    "en",
                    spk,
                    count_en_fake,
                ):

                    count_en_fake += 1
                    west_fake_count += 1

            except Exception:
                continue

    except Exception as e:

        print(
            f"Error fetching "
            f"Fake Western English: {e}"
        )


    # ============================================================
    # 3. REAL HINDI
    # bonafide_hi
    # Label = 0
    # ============================================================

    print(
        "\n3. Fetching Verified Real Hindi Speech..."
    )

    count_hi_real = 0

    try:

        ds_indic_hi = load_dataset(
            "SherryT997/IndicTTS-Deepfake-Challenge-Data",
            split="train",
            streaming=True,
        )

        for item in tqdm(
            ds_indic_hi,
            total=samples_per_bucket,
            desc="Real-HI",
        ):

            if count_hi_real >= samples_per_bucket:
                break

            try:

                lang = str(
                    item.get(
                        "language",
                        "",
                    )
                ).lower()

                is_tts = item.get(
                    "is_tts",
                    item.get(
                        "label",
                        0,
                    ),
                )

                if (
                    "hindi" in lang
                    and is_tts == 0
                ):

                    data, sr = (
                        get_audio_from_item(item)
                    )

                    if data is None:
                        continue

                    spk = (
                        f"real_hi_"
                        f"{count_hi_real % 20}"
                    )

                    if write_audio(
                        data,
                        sr,
                        "bonafide",
                        "hi",
                        spk,
                        count_hi_real,
                    ):

                        count_hi_real += 1

            except Exception:
                continue

    except Exception as e:

        print(
            f"Error fetching Real Hindi: {e}"
        )


    # ============================================================
    # 4. FAKE HINDI
    # spoof_hi
    # Label = 1
    # ============================================================

    print(
        "\n4. Fetching Diverse Synthetic Hindi Speech..."
    )

    count_hi_fake = 0

    try:

        ds_indic_fake_hi = load_dataset(
            "SherryT997/IndicTTS-Deepfake-Challenge-Data",
            split="train",
            streaming=True,
        )

        for item in tqdm(
            ds_indic_fake_hi,
            total=samples_per_bucket,
            desc="Spoof-HI",
        ):

            if count_hi_fake >= samples_per_bucket:
                break

            try:

                lang = str(
                    item.get(
                        "language",
                        "",
                    )
                ).lower()

                is_tts = item.get(
                    "is_tts",
                    item.get(
                        "label",
                        1,
                    ),
                )

                if (
                    "hindi" in lang
                    and is_tts == 1
                ):

                    data, sr = (
                        get_audio_from_item(item)
                    )

                    if data is None:
                        continue

                    spk = (
                        f"synth_hi_"
                        f"{count_hi_fake % 20}"
                    )

                    if write_audio(
                        data,
                        sr,
                        "spoof",
                        "hi",
                        spk,
                        count_hi_fake,
                    ):

                        count_hi_fake += 1

            except Exception:
                continue

    except Exception as e:

        print(
            f"Error fetching Fake Hindi: {e}"
        )


    # ============================================================
    # FINAL SUMMARY
    # ============================================================

    print(
        "\n================================================================="
    )

    print(
        "Balanced dataset ingestion complete."
    )

    print(
        f"Real English : {count_en_real}/{samples_per_bucket}"
    )

    print(
        f"Fake English : {count_en_fake}/{samples_per_bucket}"
    )

    print(
        f"Real Hindi   : {count_hi_real}/{samples_per_bucket}"
    )

    print(
        f"Fake Hindi   : {count_hi_fake}/{samples_per_bucket}"
    )

    print(
        "================================================================="
    )

    print(
        "\nSamples stored in data/raw/"
    )


# ================================================================
# ENTRY POINT
# ================================================================

if __name__ == "__main__":

    download_dataset(
        samples_per_bucket=150
    )
