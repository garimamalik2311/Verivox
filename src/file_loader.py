"""
file_loader.py
Loads an audio file in any supported format (WAV, MP3, M4A, OGG, FLAC)
and standardizes it to 16kHz mono — the format every downstream module expects.

librosa.load() internally uses audioread/soundfile (and ffmpeg for formats like
MP3/M4A that soundfile can't decode natively), so this one function transparently
handles all five formats without needing per-format branching logic.
"""

import os
import numpy as np
import librosa

from src.config import SAMPLE_RATE, CHANNELS, SUPPORTED_FORMATS


def load_audio_file(filepath: str) -> np.ndarray:
    """
    Load an audio file and return a 1D numpy array of float32 samples,
    resampled to SAMPLE_RATE (16kHz) and downmixed to mono.

    Args:
        filepath: path to a .wav/.mp3/.m4a/.ogg/.flac file

    Returns:
        np.ndarray of shape (n_samples,), dtype float32, values in [-1.0, 1.0]
    """
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported format '{ext}'. Supported: {SUPPORTED_FORMATS}"
        )

    if not os.path.exists(filepath):
        raise FileNotFoundError(filepath)

    # sr=SAMPLE_RATE tells librosa to resample during load
    # mono=True downmixes stereo -> mono by averaging channels
    audio, _ = librosa.load(filepath, sr=SAMPLE_RATE, mono=(CHANNELS == 1))

    return audio.astype(np.float32)


def get_audio_duration(audio: np.ndarray) -> float:
    """Return duration of a loaded audio array in seconds."""
    return len(audio) / SAMPLE_RATE


if __name__ == "__main__":
    # Quick manual test: python3 file_loader.py path/to/file.wav
    import sys
    if len(sys.argv) > 1:
        a = load_audio_file(sys.argv[1])
        print(f"Loaded {len(a)} samples, {get_audio_duration(a):.2f}s, dtype={a.dtype}")
    else:
        print("Usage: python3 file_loader.py <audio_file>")
