
"""
Verivox balanced audio dataset downloader.

Target dataset: 1,800 WAV files

Composition
------------
bonafide_en:
    150 Indian English REAL  - ai4bharat/Svarah
    150 Foreign English REAL - garystafford/deepfake-audio-detection

spoof_en:
    150 Indian English FAKE  - SherryT997/IndicTTS-Deepfake-Challenge-Data
    150 Foreign English FAKE - garystafford/deepfake-audio-detection

bonafide_hi:
    300 Hindi REAL - SherryT997/IndicTTS-Deepfake-Challenge-Data

spoof_hi:
    300 Hindi FAKE - SherryT997/IndicTTS-Deepfake-Challenge-Data

bonafide_ta:
    300 Tamil REAL - ai4bharat/IndicVoices

spoof_ta:
    300 Tamil FAKE - SherryT997/IndicTTS-Deepfake-Challenge-Data

Run from project root:
    python -m src.dataset
"""

from pathlib import Path
import io
import time

import numpy as np
import soundfile as sf
from datasets import load_dataset


# ============================================================
# CONFIGURATION
# ============================================================

RAW_DIR = Path("data/raw")
SAMPLE_RATE = 16000

TARGETS = {
    "bonafide_en": 300,
    "spoof_en": 300,
    "bonafide_hi": 300,
    "spoof_hi": 300,
    "bonafide_ta": 300,
    "spoof_ta": 300,
}

TOTAL_TARGET = 1800

# Source-specific targets.
SOURCE_TARGETS = {
    "svarah_real_en": 150,
    "gary_real_en": 150,
    "indictts_fake_en": 150,
    "gary_fake_en": 150,
    "indictts_real_hi": 300,
    "indictts_fake_hi": 300,
    "indictts_fake_ta": 300,
    "indicvoices_real_ta": 300,
}


# ============================================================
# DATASET NAMES
# ============================================================

SVARAH_DATASET = "ai4bharat/Svarah"
SVARAH_SPLIT = "test"

GARY_DATASET = "garystafford/deepfake-audio-detection"
GARY_SPLIT = "train"

INDICTTS_DATASET = "SherryT997/IndicTTS-Deepfake-Challenge-Data"
INDICTTS_SPLIT = "train"

INDICVOICES_DATASET = "ai4bharat/IndicVoices"

# IMPORTANT:
# IndicVoices does NOT have a "test" split in the current dataset.
# Available splits are train and valid.
INDICVOICES_SPLIT = "valid"
INDICVOICES_CONFIG = "tamil"


# ============================================================
# DIRECTORY / FILE HELPERS
# ============================================================

def ensure_directories():
    for bucket in TARGETS:
        (RAW_DIR / bucket).mkdir(parents=True, exist_ok=True)


def wav_files(bucket):
    """Return all WAV files in a bucket recursively."""
    directory = RAW_DIR / bucket

    if not directory.exists():
        return []

    return sorted(directory.rglob("*.wav"))


def count_files(bucket):
    return len(wav_files(bucket))


def total_files():
    return sum(count_files(bucket) for bucket in TARGETS)


def numeric_index(path):
    """
    Extract the trailing numeric part from filenames such as:

        bonafide_en_0001.wav
        spoof_hi_0235.wav

    Returns -1 if no numeric suffix exists.
    """
    try:
        return int(path.stem.rsplit("_", 1)[-1])
    except (ValueError, IndexError):
        return -1


def next_index(bucket):
    """
    Get the next global file number for a bucket.

    This avoids overwriting files if the downloader is resumed.
    """
    files = wav_files(bucket)

    if not files:
        return 1

    maximum = max(numeric_index(path) for path in files)

    if maximum >= 0:
        return maximum + 1

    return len(files) + 1


def speaker_directory(bucket, speaker):
    directory = RAW_DIR / bucket / speaker
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def output_path(bucket, speaker, index):
    directory = speaker_directory(bucket, speaker)

    return directory / f"{bucket}_{index:04d}.wav"


# ============================================================
# AUDIO DECODING
# ============================================================

def get_audio_from_item(item):
    """
    Extract audio and sample rate from Hugging Face dataset rows.

    Supports:
        - TorchCodec AudioDecoder
        - HF Audio dictionaries
        - raw bytes
        - numpy arrays
        - lists
        - audio_filepath / audio_file fields
    """

    audio = None

    # --------------------------------------------------------
    # Find the audio field
    # --------------------------------------------------------

    for key in (
        "audio",
        "audio_filepath",
        "audio_file",
        "audio_data",
    ):
        if key in item and item[key] is not None:
            audio = item[key]
            break

    if audio is None:
        raise ValueError(
            f"No audio field found. Available fields: {list(item.keys())}"
        )

    # --------------------------------------------------------
    # TorchCodec AudioDecoder
    # --------------------------------------------------------

    if hasattr(audio, "get_all_samples"):
        samples = audio.get_all_samples()

        data = samples.data
        sample_rate = int(samples.sample_rate)

        # Torch tensors -> numpy
        if hasattr(data, "detach"):
            data = data.detach().cpu().numpy()

        data = np.asarray(data)

        # Usually TorchCodec gives [channels, time]
        if data.ndim == 2:
            if data.shape[0] <= 8 and data.shape[1] > data.shape[0]:
                data = data.mean(axis=0)
            else:
                data = data.mean(axis=1)

        return np.asarray(data), sample_rate

    # --------------------------------------------------------
    # Hugging Face Audio dictionary
    # --------------------------------------------------------

    if isinstance(audio, dict):

        sample_rate = audio.get("sampling_rate")

        # Decoded array
        if audio.get("array") is not None:
            data = np.asarray(audio["array"])

            if data.ndim == 2:
                if data.shape[0] <= 8 and data.shape[1] > data.shape[0]:
                    data = data.mean(axis=0)
                else:
                    data = data.mean(axis=1)

            return data, int(sample_rate or SAMPLE_RATE)

        # Encoded bytes
        if audio.get("bytes") is not None:
            raw = audio["bytes"]

            data, sr = sf.read(io.BytesIO(raw), dtype="float32")

            if data.ndim == 2:
                data = data.mean(axis=1)

            return data, int(sr)

        # Path
        if audio.get("path"):
            data, sr = sf.read(audio["path"], dtype="float32")

            if data.ndim == 2:
                data = data.mean(axis=1)

            return data, int(sr)

    # --------------------------------------------------------
    # Raw bytes
    # --------------------------------------------------------

    if isinstance(audio, (bytes, bytearray)):
        data, sr = sf.read(io.BytesIO(audio), dtype="float32")

        if data.ndim == 2:
            data = data.mean(axis=1)

        return data, int(sr)

    # --------------------------------------------------------
    # Numpy / list
    # --------------------------------------------------------

    if isinstance(audio, (np.ndarray, list, tuple)):
        data = np.asarray(audio)

        if data.ndim == 2:
            if data.shape[0] <= 8 and data.shape[1] > data.shape[0]:
                data = data.mean(axis=0)
            else:
                data = data.mean(axis=1)

        return data, SAMPLE_RATE

    # --------------------------------------------------------
    # Audio path
    # --------------------------------------------------------

    if isinstance(audio, str):
        data, sr = sf.read(audio, dtype="float32")

        if data.ndim == 2:
            data = data.mean(axis=1)

        return data, int(sr)

    raise TypeError(
        f"Unsupported audio type: {type(audio)}"
    )


def save_audio(audio, path):
    """
    Save audio as mono 16 kHz WAV.
    """

    data, sr = get_audio_from_item(audio) if isinstance(audio, dict) else audio

    data = np.asarray(data)

    # Convert stereo/multichannel to mono.
    if data.ndim == 2:
        if data.shape[0] <= 8 and data.shape[1] > data.shape[0]:
            data = data.mean(axis=0)
        else:
            data = data.mean(axis=1)

    data = data.astype(np.float32)

    # Resampling.
    if sr != SAMPLE_RATE:
        try:
            import librosa

            data = librosa.resample(
                data,
                orig_sr=sr,
                target_sr=SAMPLE_RATE,
            )

        except ImportError:
            raise RuntimeError(
                "librosa is required for resampling. "
                "Install it with: pip install librosa"
            )

    # Prevent clipping.
    peak = np.max(np.abs(data)) if len(data) else 0

    if peak > 1.0:
        data = data / peak

    sf.write(
        str(path),
        data,
        SAMPLE_RATE,
        subtype="PCM_16",
    )


# ============================================================
# SAFE DATASET LOADING
# ============================================================

def load_streaming(dataset_name, split, config=None):
    """
    Load a dataset in streaming mode.

    Streaming is important because IndicTTS is large.
    """

    kwargs = {
        "path": dataset_name,
        "split": split,
        "streaming": True,
    }

    if config is not None:
        kwargs["name"] = config

    return load_dataset(**kwargs)


# ============================================================
# GENERIC COLLECTOR
# ============================================================

def collect_dataset(
    dataset,
    bucket,
    target,
    speaker_prefix,
    predicate,
    label,
    max_scan=None,
):
    """
    Collect up to `target` samples from a streaming dataset.

    Existing files are respected.

    IMPORTANT:
    This function never downloads more than the requested target.
    """

    existing = count_files(bucket)

    if existing >= target:
        print(
            f"{bucket}: already has {existing}/{target}. Skipping."
        )
        return existing

    remaining = target - existing
    start = next_index(bucket)

    print()
    print("-" * 65)
    print(f"Downloading: {label}")
    print(f"Bucket:      {bucket}")
    print(f"Target:      {target}")
    print(f"Existing:    {existing}")
    print(f"Remaining:   {remaining}")
    print("-" * 65)

    downloaded = 0
    scanned = 0

    for item in dataset:

        scanned += 1

        if max_scan is not None and scanned > max_scan:
            break

        try:
            if not predicate(item):
                continue

            audio, sr = get_audio_from_item(item)

            index = start + downloaded

            speaker = f"{speaker_prefix}_{downloaded % 20}"

            path = output_path(
                bucket,
                speaker,
                index,
            )

            save_audio(
                (audio, sr),
                path,
            )

            downloaded += 1

            if downloaded % 25 == 0 or downloaded == remaining:
                print(
                    f"  {label}: "
                    f"{downloaded}/{remaining} "
                    f"(scanned {scanned})"
                )

            if downloaded >= remaining:
                break

        except Exception as exc:
            print(
                f"  Warning: skipped sample "
                f"at scan {scanned}: {exc}"
            )

    final_count = count_files(bucket)

    print(
        f"{label} finished: "
        f"{final_count}/{target}"
    )

    return final_count


# ============================================================
# SVARAH
# ============================================================

def download_svarah_real():
    """
    Svarah test split is used as Indian English real.

    IMPORTANT:
    Svarah's `primary_language` field describes the speaker's
    primary/native language and should NOT be used to filter
    English speech here.
    """

    bucket = "bonafide_en"
    target = 150

    existing_source = len(
        list((RAW_DIR / bucket).glob("svarah_*/*.wav"))
    )

    if existing_source >= target:
        print(
            f"Svarah Indian English real already has "
            f"{existing_source}/{target}"
        )
        return

    remaining = target - existing_source

    print()
    print("=" * 65)
    print(
        f"Downloading Svarah Indian English REAL: "
        f"{remaining} files"
    )
    print("=" * 65)

    ds = load_streaming(
        SVARAH_DATASET,
        SVARAH_SPLIT,
    )

    downloaded = 0

    for item in ds:

        if downloaded >= remaining:
            break

        try:
            audio, sr = get_audio_from_item(item)

            speaker = f"svarah_{downloaded % 20}"

            # Global index inside bonafide_en.
            index = next_index(bucket)

            path = output_path(
                bucket,
                speaker,
                index,
            )

            save_audio(
                (audio, sr),
                path,
            )

            downloaded += 1

            if downloaded % 25 == 0 or downloaded == remaining:
                print(
                    f"  Svarah: "
                    f"{downloaded}/{remaining}"
                )

        except Exception as exc:
            print(
                f"  Warning: skipped Svarah sample: {exc}"
            )

    print(
        f"Svarah finished. "
        f"Indian English real source: {downloaded}/{remaining}"
    )


# ============================================================
# GARY
# ============================================================

def gary_label(item):
    """
    Extract Gary dataset label.

    Expected:
        0 = real
        1 = fake
    """

    for key in ("label", "labels", "is_fake"):
        if key in item:
            value = item[key]

            if isinstance(value, str):
                value_lower = value.lower()

                if value_lower in (
                    "real",
                    "bonafide",
                    "bona_fide",
                    "0",
                ):
                    return 0

                if value_lower in (
                    "fake",
                    "spoof",
                    "synthetic",
                    "1",
                ):
                    return 1

            try:
                return int(value)
            except Exception:
                pass

    return None


def download_gary_real():
    bucket = "bonafide_en"
    target = 150

    existing_source = len(
        list((RAW_DIR / bucket).glob("west_real_*/*.wav"))
    )

    if existing_source >= target:
        print(
            f"Gary foreign English REAL already has "
            f"{existing_source}/{target}"
        )
        return

    remaining = target - existing_source

    print()
    print("-" * 65)
    print(
        f"Downloading foreign English REAL from Gary: "
        f"{remaining} files"
    )
    print("-" * 65)

    ds = load_streaming(
        GARY_DATASET,
        GARY_SPLIT,
    )

    downloaded = 0
    scanned = 0

    for item in ds:

        scanned += 1

        if downloaded >= remaining:
            break

        try:
            if gary_label(item) != 0:
                continue

            audio, sr = get_audio_from_item(item)

            speaker = f"west_real_{downloaded % 15}"

            index = next_index(bucket)

            path = output_path(
                bucket,
                speaker,
                index,
            )

            save_audio(
                (audio, sr),
                path,
            )

            downloaded += 1

            if downloaded % 25 == 0 or downloaded == remaining:
                print(
                    f"  Gary real: "
                    f"{downloaded}/{remaining}"
                )

        except Exception as exc:
            print(
                f"  Warning: skipped Gary real sample "
                f"at scan {scanned}: {exc}"
            )

    print(
        f"Gary real finished: "
        f"{downloaded}/{remaining}"
    )


def download_gary_fake():
    bucket = "spoof_en"
    target = 150

    existing_source = len(
        list((RAW_DIR / bucket).glob("west_synth_*/*.wav"))
    )

    if existing_source >= target:
        print(
            f"Gary foreign English FAKE already has "
            f"{existing_source}/{target}"
        )
        return

    remaining = target - existing_source

    print()
    print("-" * 65)
    print(
        f"Downloading foreign English FAKE from Gary: "
        f"{remaining} files"
    )
    print("-" * 65)

    ds = load_streaming(
        GARY_DATASET,
        GARY_SPLIT,
    )

    downloaded = 0
    scanned = 0

    for item in ds:

        scanned += 1

        if downloaded >= remaining:
            break

        try:
            if gary_label(item) != 1:
                continue

            audio, sr = get_audio_from_item(item)

            speaker = f"west_synth_{downloaded % 15}"

            index = next_index(bucket)

            path = output_path(
                bucket,
                speaker,
                index,
            )

            save_audio(
                (audio, sr),
                path,
            )

            downloaded += 1

            if downloaded % 25 == 0 or downloaded == remaining:
                print(
                    f"  Gary fake: "
                    f"{downloaded}/{remaining}"
                )

        except Exception as exc:
            print(
                f"  Warning: skipped Gary fake sample "
                f"at scan {scanned}: {exc}"
            )

    print(
        f"Gary fake finished: "
        f"{downloaded}/{remaining}"
    )


# ============================================================
# INDICTTS
# ============================================================

def indictts_language(item):
    value = item.get("language")

    if value is None:
        return ""

    return str(value).strip().lower()


def indictts_is_fake(item):
    """
    IndicTTS:
        is_tts = 1 -> synthetic/fake
        is_tts = 0 -> real
    """

    value = item.get("is_tts")

    try:
        return int(value) == 1
    except Exception:
        return False


def indictts_is_real(item):
    value = item.get("is_tts")

    try:
        return int(value) == 0
    except Exception:
        return False


def download_indictts_all():
    """
    Scan IndicTTS exactly ONCE.

    The dataset is ordered roughly by language, so Tamil appears
    near the end. A single scan avoids repeatedly resolving and
    scanning all 35 parquet files.
    """

    targets = {
        "english_fake": 150,
        "hindi_real": 300,
        "hindi_fake": 300,
        "tamil_fake": 300,
    }

    buckets = {
        "english_fake": "spoof_en",
        "hindi_real": "bonafide_hi",
        "hindi_fake": "spoof_hi",
        "tamil_fake": "spoof_ta",
    }

    speakers = {
        "english_fake": "indic_synth_en",
        "hindi_real": "real_hi",
        "hindi_fake": "synth_hi",
        "tamil_fake": "synth_ta",
    }

    # --------------------------------------------------------
    # Check what is still required.
    # --------------------------------------------------------

    remaining = {}

    for key, target in targets.items():

        bucket = buckets[key]

        existing_source = len(
            list(
                (RAW_DIR / bucket).glob(
                    f"{speakers[key]}_*/*.wav"
                )
            )
        )

        remaining[key] = max(
            0,
            target - existing_source,
        )

    print()
    print("=" * 65)
    print("INDICTTS DOWNLOAD PLAN")
    print("=" * 65)

    for key in targets:
        print(
            f"{key:<18}: "
            f"{targets[key] - remaining[key]}/"
            f"{targets[key]}"
            f"  remaining={remaining[key]}"
        )

    # Nothing needed from IndicTTS.
    if not any(value > 0 for value in remaining.values()):
        print()
        print("All IndicTTS targets already complete.")
        return

    print()
    print("Loading IndicTTS once...")
    print()

    ds = load_streaming(
        INDICTTS_DATASET,
        INDICTTS_SPLIT,
    )

    print("IndicTTS stream ready.")
    print("Scanning once for all required categories...")

    counts = {
        key: 0
        for key in targets
    }

    scanned = 0

    # --------------------------------------------------------
    # Scan
    # --------------------------------------------------------

    for item in ds:

        scanned += 1

        # ----------------------------------------------------
        # Stop as soon as every required source target is full.
        # ----------------------------------------------------

        all_done = True

        for key in targets:
            if counts[key] < remaining[key]:
                all_done = False
                break

        if all_done:
            break

        language = indictts_language(item)

        # ----------------------------------------------------
        # English fake
        # ----------------------------------------------------

        if (
            language == "english"
            and indictts_is_fake(item)
            and counts["english_fake"]
            < remaining["english_fake"]
        ):
            key = "english_fake"
            bucket = buckets[key]

            try:
                audio, sr = get_audio_from_item(item)

                index = next_index(bucket)

                speaker = (
                    f"{speakers[key]}_"
                    f"{counts[key] % 15}"
                )

                path = output_path(
                    bucket,
                    speaker,
                    index,
                )

                save_audio(
                    (audio, sr),
                    path,
                )

                counts[key] += 1

                if counts[key] % 25 == 0:
                    print(
                        f"  English fake: "
                        f"{counts[key]}/"
                        f"{remaining[key]} "
                        f"(scanned {scanned})"
                    )

            except Exception as exc:
                print(
                    f"  Warning: skipped English fake "
                    f"at row {scanned}: {exc}"
                )

        # ----------------------------------------------------
        # Hindi real
        # ----------------------------------------------------

        elif (
            language == "hindi"
            and indictts_is_real(item)
            and counts["hindi_real"]
            < remaining["hindi_real"]
        ):
            key = "hindi_real"
            bucket = buckets[key]

            try:
                audio, sr = get_audio_from_item(item)

                index = next_index(bucket)

                speaker = (
                    f"{speakers[key]}_"
                    f"{counts[key] % 20}"
                )

                path = output_path(
                    bucket,
                    speaker,
                    index,
                )

                save_audio(
                    (audio, sr),
                    path,
                )

                counts[key] += 1

                if counts[key] % 25 == 0:
                    print(
                        f"  Hindi real: "
                        f"{counts[key]}/"
                        f"{remaining[key]} "
                        f"(scanned {scanned})"
                    )

            except Exception as exc:
                print(
                    f"  Warning: skipped Hindi real "
                    f"at row {scanned}: {exc}"
                )

        # ----------------------------------------------------
        # Hindi fake
        # ----------------------------------------------------

        elif (
            language == "hindi"
            and indictts_is_fake(item)
            and counts["hindi_fake"]
            < remaining["hindi_fake"]
        ):
            key = "hindi_fake"
            bucket = buckets[key]

            try:
                audio, sr = get_audio_from_item(item)

                index = next_index(bucket)

                speaker = (
                    f"{speakers[key]}_"
                    f"{counts[key] % 20}"
                )

                path = output_path(
                    bucket,
                    speaker,
                    index,
                )

                save_audio(
                    (audio, sr),
                    path,
                )

                counts[key] += 1

                if counts[key] % 25 == 0:
                    print(
                        f"  Hindi fake: "
                        f"{counts[key]}/"
                        f"{remaining[key]} "
                        f"(scanned {scanned})"
                    )

            except Exception as exc:
                print(
                    f"  Warning: skipped Hindi fake "
                    f"at row {scanned}: {exc}"
                )

        # ----------------------------------------------------
        # Tamil fake
        # ----------------------------------------------------

        elif (
            language == "tamil"
            and indictts_is_fake(item)
            and counts["tamil_fake"]
            < remaining["tamil_fake"]
        ):
            key = "tamil_fake"
            bucket = buckets[key]

            try:
                audio, sr = get_audio_from_item(item)

                index = next_index(bucket)

                speaker = (
                    f"{speakers[key]}_"
                    f"{counts[key] % 20}"
                )

                path = output_path(
                    bucket,
                    speaker,
                    index,
                )

                save_audio(
                    (audio, sr),
                    path,
                )

                counts[key] += 1

                if counts[key] % 25 == 0:
                    print(
                        f"  Tamil fake: "
                        f"{counts[key]}/"
                        f"{remaining[key]} "
                        f"(scanned {scanned})"
                    )

            except Exception as exc:
                print(
                    f"  Warning: skipped Tamil fake "
                    f"at row {scanned}: {exc}"
                )

        # ----------------------------------------------------
        # Progress every 1,000 rows.
        # ----------------------------------------------------

        if scanned % 1000 == 0:
            status = " | ".join(
                f"{key}={counts[key]}/{remaining[key]}"
                for key in targets
            )

            print(
                f"  Scanned {scanned:,} rows | {status}"
            )

    print()
    print("IndicTTS scan finished.")
    print(f"Total rows scanned: {scanned:,}")

    for key in targets:
        print(
            f"  {key}: "
            f"{counts[key]}/{remaining[key]}"
        )


# ============================================================
# INDICVOICES - TAMIL REAL
# ============================================================

def download_tamil_real():
    """
    Download Tamil real samples from IndicVoices.

    IMPORTANT:
    The currently available IndicVoices configuration is:

        tamil

    and the split available for this configuration is:

        train
        valid

    There is NO test split, so we use `valid`.
    """

    bucket = "bonafide_ta"
    target = 300

    existing = count_files(bucket)

    if existing >= target:
        print()
        print(
            f"Tamil real already complete: "
            f"{existing}/{target}"
        )
        return

    remaining = target - existing

    print()
    print("-" * 65)
    print(
        f"Downloading Tamil REAL from IndicVoices: "
        f"{remaining} files"
    )
    print("-" * 65)

    print("Dataset :", INDICVOICES_DATASET)
    print("Config  :", INDICVOICES_CONFIG)
    print("Split   :", INDICVOICES_SPLIT)

    # --------------------------------------------------------
    # Correct configuration and split.
    # --------------------------------------------------------

    ds = load_streaming(
        INDICVOICES_DATASET,
        INDICVOICES_SPLIT,
        config=INDICVOICES_CONFIG,
    )

    downloaded = 0
    scanned = 0

    for item in ds:

        scanned += 1

        if downloaded >= remaining:
            break

        try:
            audio, sr = get_audio_from_item(item)

            speaker = (
                f"indicvoices_ta_"
                f"{downloaded % 20}"
            )

            index = next_index(bucket)

            path = output_path(
                bucket,
                speaker,
                index,
            )

            save_audio(
                (audio, sr),
                path,
            )

            downloaded += 1

            if downloaded % 25 == 0 or downloaded == remaining:
                print(
                    f"  Tamil real: "
                    f"{downloaded}/{remaining} "
                    f"(scanned {scanned})"
                )

        except Exception as exc:
            print(
                f"  Warning: skipped Tamil real "
                f"at scan {scanned}: {exc}"
            )

    final_count = count_files(bucket)

    print(
        f"Tamil real finished: "
        f"{final_count}/{target}"
    )


# ============================================================
# VALIDATION
# ============================================================

def print_status():
    print()
    print("=" * 70)
    print("DATASET STATUS")
    print("=" * 70)

    total = 0

    for bucket, target in TARGETS.items():

        count = count_files(bucket)
        total += count

        status = "OK" if count == target else "INCOMPLETE"

        print(
            f"{bucket:<18} "
            f"{count:>3}/{target:<3} "
            f"{status}"
        )

    print("-" * 70)
    print(
        f"{'TOTAL':<18} "
        f"{total:>3}/{TOTAL_TARGET}"
    )
    print("=" * 70)


def validate_final_dataset():
    print()
    print("=" * 70)
    print("FINAL VALIDATION")
    print("=" * 70)

    success = True

    for bucket, target in TARGETS.items():

        count = count_files(bucket)

        if count != target:
            success = False

        print(
            f"{bucket:<18}: "
            f"{count}/{target}"
        )

    total = total_files()

    print("-" * 70)
    print(
        f"TOTAL              : "
        f"{total}/{TOTAL_TARGET}"
    )

    if success and total == TOTAL_TARGET:
        print()
        print("SUCCESS")
        print("All six buckets contain exactly 300 WAV files.")
        print("Total dataset size: 1,800 WAV files.")
    else:
        print()
        print("DATASET INCOMPLETE")
        print("Run the downloader again to resume missing files.")

    print("=" * 70)

    return success


# ============================================================
# MAIN
# ============================================================

def main():

    ensure_directories()

    print("=" * 70)
    print("VERIVOX DATASET DOWNLOADER")
    print("=" * 70)

    print()
    print("Target composition:")
    print()
    print("bonafide_en")
    print("    150 Indian English REAL  (Svarah)")
    print("    150 Foreign English REAL (Gary)")
    print()
    print("spoof_en")
    print("    150 Indian English FAKE  (IndicTTS)")
    print("    150 Foreign English FAKE (Gary)")
    print()
    print("bonafide_hi")
    print("    300 Hindi REAL            (IndicTTS)")
    print()
    print("spoof_hi")
    print("    300 Hindi FAKE            (IndicTTS)")
    print()
    print("bonafide_ta")
    print("    300 Tamil REAL            (IndicVoices valid)")
    print()
    print("spoof_ta")
    print("    300 Tamil FAKE            (IndicTTS)")
    print()
    print("TOTAL = 1,800 files")
    print()

    print_status()

    # ========================================================
    # 1. INDIAN ENGLISH REAL
    # ========================================================

    print()
    print("=" * 70)
    print("1/6 — INDIAN ENGLISH REAL")
    print("=" * 70)

    download_svarah_real()

    # ========================================================
    # 2. FOREIGN ENGLISH REAL
    # ========================================================

    print()
    print("=" * 70)
    print("2/6 — FOREIGN ENGLISH REAL")
    print("=" * 70)

    download_gary_real()

    # ========================================================
    # 3. INDIC TTS
    # ========================================================
    #
    # CRITICAL:
    # IndicTTS is loaded and scanned ONCE.
    #
    # This prevents the old behavior where the 35 parquet files
    # were repeatedly resolved/scanned for each category.
    #
    # ========================================================

    print()
    print("=" * 70)
    print("3/6 — INDICTTS")
    print("=" * 70)

    download_indictts_all()

    # ========================================================
    # 4. FOREIGN ENGLISH FAKE
    # ========================================================

    print()
    print("=" * 70)
    print("4/6 — FOREIGN ENGLISH FAKE")
    print("=" * 70)

    download_gary_fake()

    # ========================================================
    # 5. TAMIL REAL
    # ========================================================

    print()
    print("=" * 70)
    print("5/6 — TAMIL REAL")
    print("=" * 70)

    download_tamil_real()

    # ========================================================
    # 6. FINAL STATUS
    # ========================================================

    print()
    print("=" * 70)
    print("6/6 — FINAL VALIDATION")
    print("=" * 70)

    validate_final_dataset()


if __name__ == "__main__":
    main()

