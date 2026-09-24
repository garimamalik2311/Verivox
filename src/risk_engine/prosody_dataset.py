from pathlib import Path
import wave

import librosa
import numpy as np
import pandas as pd


DATA_ROOT = Path("data/raw")
OUTPUT_PATH = Path("reports/prosody_dataset.csv")

SAMPLE_RATE = 16000
FRAME_LENGTH = 1024
HOP_LENGTH = 512
FMIN = 65.0
FMAX = 400.0


def load_audio(path: Path) -> tuple[np.ndarray, int]:
    """Load a mono WAV file and return float32 audio + sample rate."""
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())

    if channels != 1:
        raise ValueError(f"Expected mono audio, got {channels} channels")

    if sample_width != 2:
        raise ValueError(
            f"Expected 16-bit PCM, got {sample_width * 8}-bit audio"
        )

    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
    audio /= 32768.0

    return audio, sample_rate


def extract_prosody_features(
    audio: np.ndarray,
    sr: int,
) -> dict[str, float]:
    """Extract recording-level prosody features."""

    duration = len(audio) / sr if sr else 0.0

    if len(audio) < FRAME_LENGTH:
        return {
            "duration": duration,
            "f0_mean": np.nan,
            "f0_std": np.nan,
            "yin_f0_mean": np.nan,
            "yin_f0_std": np.nan,
            "yin_voiced_ratio": 0.0,
            "pitch_range": np.nan,
            "pitch_change_rate": np.nan,
        }

    # ------------------------------------------------------------------
    # Existing-project-style pitch contour
    # ------------------------------------------------------------------
    try:
        f0, voiced_flag, voiced_prob = librosa.pyin(
            audio,
            fmin=FMIN,
            fmax=FMAX,
            sr=sr,
            frame_length=FRAME_LENGTH,
            hop_length=HOP_LENGTH,
        )

        valid_f0 = f0[np.isfinite(f0)]

        if valid_f0.size > 0:
            f0_mean = float(np.mean(valid_f0))
            f0_std = float(np.std(valid_f0))
            pitch_range = float(
                np.percentile(valid_f0, 95)
                - np.percentile(valid_f0, 5)
            )

            # Relative frame-to-frame pitch movement.
            if valid_f0.size >= 2:
                previous = valid_f0[:-1]
                current = valid_f0[1:]

                valid_pairs = previous > 0

                changes = (
                    np.abs(current[valid_pairs] - previous[valid_pairs])
                    / previous[valid_pairs]
                )

                pitch_change_rate = float(np.mean(changes))
            else:
                pitch_change_rate = np.nan

        else:
            f0_mean = np.nan
            f0_std = np.nan
            pitch_range = np.nan
            pitch_change_rate = np.nan

    except Exception:
        f0_mean = np.nan
        f0_std = np.nan
        pitch_range = np.nan
        pitch_change_rate = np.nan

    # ------------------------------------------------------------------
    # YIN pitch statistics
    # ------------------------------------------------------------------
    try:
        yin_f0 = librosa.yin(
            audio,
            fmin=FMIN,
            fmax=FMAX,
            sr=sr,
            frame_length=FRAME_LENGTH,
            hop_length=HOP_LENGTH,
        )

        valid_yin = yin_f0[np.isfinite(yin_f0)]

        if valid_yin.size > 0:
            yin_f0_mean = float(np.mean(valid_yin))
            yin_f0_std = float(np.std(valid_yin))
            yin_voiced_ratio = float(
                valid_yin.size / max(len(yin_f0), 1)
            )
        else:
            yin_f0_mean = np.nan
            yin_f0_std = np.nan
            yin_voiced_ratio = 0.0

    except Exception:
        yin_f0_mean = np.nan
        yin_f0_std = np.nan
        yin_voiced_ratio = 0.0

    return {
        "duration": duration,
        "f0_mean": f0_mean,
        "f0_std": f0_std,
        "yin_f0_mean": yin_f0_mean,
        "yin_f0_std": yin_f0_std,
        "yin_voiced_ratio": yin_voiced_ratio,
        "pitch_range": pitch_range,
        "pitch_change_rate": pitch_change_rate,
    }


def infer_metadata(path: Path) -> dict[str, str]:
    """Infer label, language, and group from dataset path."""

    category = path.parts[-3]
    group = path.parts[-2]

    if category.startswith("bonafide_"):
        label = 0
        language = category.replace("bonafide_", "")
    elif category.startswith("spoof_"):
        label = 1
        language = category.replace("spoof_", "")
    else:
        raise ValueError(f"Unknown dataset category: {category}")

    return {
        "label": label,
        "language": language,
        "group": group,
        "file": str(path),
    }


def main() -> None:
    files = sorted(DATA_ROOT.rglob("*.wav"))

    print(f"Found {len(files)} WAV files")

    rows = []
    errors = []

    for index, path in enumerate(files, start=1):
        try:
            audio, sr = load_audio(path)

            if sr != SAMPLE_RATE:
                raise ValueError(
                    f"Expected {SAMPLE_RATE} Hz, got {sr} Hz"
                )

            features = extract_prosody_features(audio, sr)
            metadata = infer_metadata(path)

            rows.append({
                **metadata,
                **features,
            })

        except Exception as exc:
            errors.append({
                "file": str(path),
                "error": str(exc),
            })

        if index % 100 == 0 or index == len(files):
            print(
                f"Processed {index}/{len(files)} "
                f"(errors={len(errors)})"
            )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT_PATH, index=False)

    print()
    print(f"Saved: {OUTPUT_PATH}")
    print(f"Rows: {len(df)}")
    print(f"Errors: {len(errors)}")

    if errors:
        error_path = Path("reports/prosody_dataset_errors.csv")
        pd.DataFrame(errors).to_csv(error_path, index=False)
        print(f"Errors saved: {error_path}")

    print()
    print("Label counts:")
    print(df["label"].value_counts().sort_index())

    print()
    print("Language counts:")
    print(df["language"].value_counts().sort_index())

    print()
    print("Missing values:")
    print(df.isna().sum())


if __name__ == "__main__":
    main()