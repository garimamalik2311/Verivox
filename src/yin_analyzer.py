import numpy as np
import librosa

SAMPLE_RATE = 16000
N_FFT = 1024
HOP_LENGTH = 512
FMIN = 65.0
FMAX = 400.0


def extract_yin_pitch_stats(
    y: np.ndarray,
    sr: int = SAMPLE_RATE,
) -> dict:
    """Auxiliary YIN pitch analysis. Does not affect the main 58-D detector."""
    y = np.asarray(y, dtype=np.float32).reshape(-1)

    if len(y) == 0:
        return {
            "f0_mean": 0.0,
            "f0_std": 0.0,
            "voiced_ratio": 0.0,
        }

    try:
        f0 = librosa.yin(
            y,
            fmin=FMIN,
            fmax=FMAX,
            sr=sr,
            frame_length=N_FFT,
            hop_length=HOP_LENGTH,
        )

        valid = f0[np.isfinite(f0)]

        if valid.size == 0:
            return {
                "f0_mean": 0.0,
                "f0_std": 0.0,
                "voiced_ratio": 0.0,
            }

        return {
            "f0_mean": float(np.mean(valid)),
            "f0_std": float(np.std(valid)),
            "voiced_ratio": float(valid.size / max(len(f0), 1)),
        }

    except Exception:
        return {
            "f0_mean": 0.0,
            "f0_std": 0.0,
            "voiced_ratio": 0.0,
        }
