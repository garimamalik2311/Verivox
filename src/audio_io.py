"""
audio_io.py — Load audio files of various formats and standardize them
to 16kHz mono, so the rest of the pipeline never has to think about
format differences again.
"""

import os
import librosa
import numpy as np

from src.config import SAMPLE_RATE, SUPPORTED_FORMATS


def is_supported_format(filepath: str) -> bool:
    """Check whether a file's extension is one we know how to load."""
    ext = os.path.splitext(filepath)[1].lower()
    return ext in SUPPORTED_FORMATS


def load_audio_file(filepath: str) -> np.ndarray:
    """
    Load an audio file (WAV/MP3/M4A/OGG/FLAC) and return it as a
    1-D numpy array of float32 samples, resampled to SAMPLE_RATE (16kHz)
    and downmixed to mono.

    librosa.load() handles format decoding, resampling, and mono
    conversion all in one call — that's why we don't need a separate
    branch of code per file format.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"No such file: {filepath}")

    if not is_supported_format(filepath):
        raise ValueError(
            f"Unsupported format '{os.path.splitext(filepath)[1]}'. "
            f"Supported: {SUPPORTED_FORMATS}"
        )

    # sr=SAMPLE_RATE forces resampling to 16kHz during load
    # mono=True downmixes stereo/multi-channel audio to a single channel
    audio, _ = librosa.load(filepath, sr=SAMPLE_RATE, mono=True)
    return audio.astype(np.float32)


def get_audio_duration(audio: np.ndarray) -> float:
    """Return duration of a loaded audio array, in seconds."""
    return len(audio) / SAMPLE_RATE
