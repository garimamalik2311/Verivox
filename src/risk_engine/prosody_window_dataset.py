from pathlib import Path
import wave

import librosa
import numpy as np
import pandas as pd

from src.config import (
    SAMPLE_RATE,
    VAD_FRAME_SAMPLES,
    WINDOW_SIZE_SAMPLES,
    WINDOW_STRIDE_SAMPLES,
)
from src.vad import VoiceActivityDetector


DATA_ROOT = Path("data/raw")
OUTPUT_PATH = Path("reports/prosody_window_dataset.csv")

FRAME_LENGTH = 1024
HOP_LENGTH = 512
FMIN = 65.0
FMAX = 400.0


def load_audio(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())

    if channels != 1:
        raise ValueError(
            f"Expected mono audio, got {channels} channels"
        )

    if sample_width != 2:
        raise ValueError(
            f"Expected 16-bit PCM, got {sample_width * 8}-bit audio"
        )

    if sample_rate != SAMPLE_RATE:
        raise ValueError(
            f"Expected {SAMPLE_RATE} Hz, got {sample_rate} Hz"
        )

    audio = (
        np.frombuffer(frames, dtype=np.int16)
        .astype(np.float32)
        / 32768.0
    )

    return audio


def infer_metadata(path: Path) -> dict:
    category = path.parts[-3]
    group = path.parts[-2]

    if category.startswith("bonafide_"):
        label = 0
        language = category.replace("bonafide_", "")
    elif category.startswith("spoof_"):
        label = 1
        language = category.replace("spoof_", "")
    else:
        raise ValueError(
            f"Unknown dataset category: {category}"
        )

    return {
        "label": label,
        "language": language,
        "group": group,
        "file": str(path),
    }


def calculate_corrected_pitch_change_rate(
    audio: np.ndarray,
) -> float:
    """
    Production-matched corrected pitch-change rate.

    Only adjacent valid F0 frames are compared.
    Invalid/unvoiced frames are never bridged.
    """
    try:
        f0 = librosa.yin(
            audio,
            fmin=FMIN,
            fmax=FMAX,
            sr=SAMPLE_RATE,
            frame_length=FRAME_LENGTH,
            hop_length=HOP_LENGTH,
        )

        if len(f0) < 2:
            return 0.0

        previous = f0[:-1]
        current = f0[1:]

        valid = (
            np.isfinite(previous)
            & np.isfinite(current)
            & (previous > 0)
            & (current > 0)
        )

        if not np.any(valid):
            return 0.0

        changes = (
            np.abs(
                current[valid] - previous[valid]
            )
            / previous[valid]
        )

        return float(np.mean(changes))

    except Exception:
        return 0.0


def extract_window_features(
    audio_window: np.ndarray,
) -> dict[str, float]:
    duration = len(audio_window) / SAMPLE_RATE

    # Production XGBoost-compatible F0 statistics.
    # Mirrors src/features.py::_extract_f0_stats() exactly.
    try:
        pitches, magnitudes = librosa.piptrack(
            y=audio_window,
            sr=SAMPLE_RATE,
            n_fft=1024,
            hop_length=512,
            fmin=70.0,
            fmax=500.0,
        )

        frame_f0 = []

        for frame_idx in range(pitches.shape[1]):
            pitch_column = pitches[:, frame_idx]
            magnitude_column = magnitudes[:, frame_idx]

            valid = (
                (pitch_column >= 70.0)
                & (pitch_column <= 500.0)
                & (magnitude_column > 0)
            )

            if not np.any(valid):
                continue

            valid_pitches = pitch_column[valid]
            valid_magnitudes = magnitude_column[valid]

            best_idx = np.argmax(valid_magnitudes)
            best_pitch = valid_pitches[best_idx]

            if np.isfinite(best_pitch):
                frame_f0.append(best_pitch)

        if len(frame_f0) == 0:
            f0_mean = 0.0
            f0_std = 0.0
        else:
            frame_f0 = np.asarray(
                frame_f0,
                dtype=np.float32,
            )

            frame_f0 = frame_f0[
                (frame_f0 >= 70.0)
                & (frame_f0 <= 500.0)
            ]

            if len(frame_f0) == 0:
                f0_mean = 0.0
                f0_std = 0.0
            else:
                median_f0 = np.median(frame_f0)

                lower = max(
                    70.0,
                    median_f0 * 0.5,
                )
                upper = min(
                    500.0,
                    median_f0 * 1.8,
                )

                filtered_f0 = frame_f0[
                    (frame_f0 >= lower)
                    & (frame_f0 <= upper)
                ]

                if len(filtered_f0) == 0:
                    filtered_f0 = frame_f0

                f0_mean = float(
                    np.mean(filtered_f0)
                )
                f0_std = float(
                    np.std(filtered_f0)
                )

    except Exception:
        f0_mean = 0.0
        f0_std = 0.0

    # YIN — same estimator used by production live inference.
    try:
        yin_f0 = librosa.yin(
            audio_window,
            fmin=FMIN,
            fmax=FMAX,
            sr=SAMPLE_RATE,
            frame_length=FRAME_LENGTH,
            hop_length=HOP_LENGTH,
        )

        valid_yin = yin_f0[
            np.isfinite(yin_f0)
            & (yin_f0 > 0)
        ]

        if valid_yin.size > 0:
            yin_f0_mean = float(np.mean(valid_yin))
            yin_f0_std = float(np.std(valid_yin))
            pitch_range = float(
                np.max(valid_yin) - np.min(valid_yin)
            )
        else:
            yin_f0_mean = np.nan
            yin_f0_std = np.nan
            pitch_range = 0.0

    except Exception:
        yin_f0_mean = np.nan
        yin_f0_std = np.nan
        pitch_range = 0.0

    corrected_rate = (
        calculate_corrected_pitch_change_rate(audio_window)
    )

    return {
        "duration": duration,
        "f0_mean": f0_mean,
        "f0_std": f0_std,
        "yin_f0_mean": yin_f0_mean,
        "yin_f0_std": yin_f0_std,
        "pitch_range": pitch_range,
        "pitch_change_rate_corrected": corrected_rate,
    }


def extract_vad_speech_windows(
    audio: np.ndarray,
    vad: VoiceActivityDetector,
) -> list[np.ndarray]:
    """
    Match the production websocket path:

        raw audio
          -> VAD frames
          -> speech-only accumulation
          -> 1 s windows
          -> 0.5 s stride
    """
    remainder = np.empty(
        0,
        dtype=np.float32,
    )

    accumulator = np.empty(
        0,
        dtype=np.float32,
    )

    windows: list[np.ndarray] = []

    # Match the websocket's VAD-frame processing.
    audio = np.asarray(
        audio,
        dtype=np.float32,
    )

    if len(remainder):
        audio = np.concatenate(
            [remainder, audio]
        )

    complete_samples = (
        len(audio) // VAD_FRAME_SAMPLES
    ) * VAD_FRAME_SAMPLES

    remainder = audio[complete_samples:]

    for start in range(
        0,
        complete_samples,
        VAD_FRAME_SAMPLES,
    ):
        frame = audio[
            start:
            start + VAD_FRAME_SAMPLES
        ]

        if not vad.is_speech(frame):
            continue

        accumulator = np.concatenate(
            [accumulator, frame]
        )

        while len(accumulator) >= WINDOW_SIZE_SAMPLES:
            window = accumulator[
                :WINDOW_SIZE_SAMPLES
            ].copy()

            # Match WindowAccumulator.push():
            # advance by 0.5 seconds, preserving 50% overlap.
            accumulator = accumulator[
                WINDOW_STRIDE_SAMPLES:
            ]

            # Production additionally checks that the completed
            # window contains at least one speech VAD frame.
            # Since this accumulator contains speech-only frames,
            # that condition is inherently satisfied.
            windows.append(window)

    return windows


def main() -> None:
    files = sorted(
        DATA_ROOT.rglob("*.wav")
    )

    print(
        f"Found {len(files)} WAV files"
    )

    vad = VoiceActivityDetector()

    rows = []
    errors = []

    total_windows = 0

    for index, path in enumerate(
        files,
        start=1,
    ):
        try:
            audio = load_audio(path)
            metadata = infer_metadata(path)

            windows = extract_vad_speech_windows(
                audio,
                vad,
            )

            for window_index, audio_window in enumerate(
                windows,
                start=1,
            ):
                features = extract_window_features(
                    audio_window
                )

                rows.append({
                    **metadata,
                    "window_index": window_index,
                    "window_samples": len(audio_window),
                    "window_duration": (
                        len(audio_window) / SAMPLE_RATE
                    ),
                    **features,
                })

            total_windows += len(windows)

        except Exception as exc:
            errors.append({
                "file": str(path),
                "error": str(exc),
            })

        if (
            index % 100 == 0
            or index == len(files)
        ):
            print(
                f"Processed {index}/{len(files)} "
                f"(windows={total_windows}, "
                f"errors={len(errors)})"
            )

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    df = pd.DataFrame(rows)

    df.to_csv(
        OUTPUT_PATH,
        index=False,
    )

    print()
    print(f"Saved: {OUTPUT_PATH}")
    print(f"Rows/windows: {len(df)}")
    print(f"Errors: {len(errors)}")

    if errors:
        error_path = Path(
            "reports/prosody_window_dataset_errors.csv"
        )

        pd.DataFrame(errors).to_csv(
            error_path,
            index=False,
        )

        print(
            f"Errors saved: {error_path}"
        )

    if len(df):
        print()
        print("Label counts:")
        print(
            df["label"]
            .value_counts()
            .sort_index()
        )

        print()
        print("Language counts:")
        print(
            df["language"]
            .value_counts()
            .sort_index()
        )

        print()
        print("Windows per recording:")
        print(
            df.groupby("file")
            .size()
            .describe()
        )

        print()
        print("Missing values:")
        print(
            df.isna().sum()
        )


if __name__ == "__main__":
    main()
