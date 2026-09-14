"""
Audio perturbation functions for adversarial robustness testing.

Each function takes a float32 mono audio array (values in [-1, 1]) and
returns a perturbed array of the same sample rate. Length may change
slightly for time-stretch; callers should handle that.
"""

import io
import numpy as np
import librosa
from pydub import AudioSegment


# ---------------------------------------------------------------------------
# Noise injection
# ---------------------------------------------------------------------------

def add_white_noise(audio: np.ndarray, snr_db: float) -> np.ndarray:
    """Add white (Gaussian) noise at a target signal-to-noise ratio in dB."""
    signal_power = np.mean(audio ** 2)
    noise_power = signal_power / (10 ** (snr_db / 10))
    noise = np.random.normal(0, np.sqrt(noise_power), size=audio.shape)
    return np.clip(audio + noise, -1.0, 1.0).astype(np.float32)


def add_pink_noise(audio: np.ndarray, snr_db: float) -> np.ndarray:
    """Add pink (1/f) noise at a target SNR in dB."""
    n = len(audio)
    # Generate pink noise via FFT filtering of white noise
    white = np.random.randn(n)
    fft_vals = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n)
    freqs[0] = freqs[1]  # avoid div by zero at DC
    fft_vals = fft_vals / np.sqrt(freqs)
    pink = np.fft.irfft(fft_vals, n).astype(np.float32)
    pink = pink / np.std(pink)  # normalize to unit variance

    signal_power = np.mean(audio ** 2)
    target_noise_power = signal_power / (10 ** (snr_db / 10))
    pink = pink * np.sqrt(target_noise_power)
    return np.clip(audio + pink, -1.0, 1.0).astype(np.float32)


def add_background_music(audio: np.ndarray, music: np.ndarray, snr_db: float) -> np.ndarray:
    """
    Mix in background music at a target speech-to-music SNR in dB.
    `music` should already be loaded at the same sample rate; will be
    tiled/truncated to match `audio` length.
    """
    if len(music) < len(audio):
        reps = int(np.ceil(len(audio) / len(music)))
        music = np.tile(music, reps)
    music = music[:len(audio)]

    signal_power = np.mean(audio ** 2)
    music_power = np.mean(music ** 2) + 1e-12
    target_music_power = signal_power / (10 ** (snr_db / 10))
    scale = np.sqrt(target_music_power / music_power)
    return np.clip(audio + music * scale, -1.0, 1.0).astype(np.float32)


# ---------------------------------------------------------------------------
# Compression artifacts
# ---------------------------------------------------------------------------

def _float32_to_audiosegment(audio: np.ndarray, sr: int = 16000) -> AudioSegment:
    pcm16 = (audio * 32767.0).clip(-32768, 32767).astype(np.int16)
    return AudioSegment(
        pcm16.tobytes(), frame_rate=sr, sample_width=2, channels=1
    )


def _audiosegment_to_float32(seg: AudioSegment) -> np.ndarray:
    samples = np.array(seg.get_array_of_samples(), dtype=np.int16)
    return (samples.astype(np.float32) / 32768.0)


def mp3_roundtrip(audio: np.ndarray, bitrate_kbps: int, sr: int = 16000) -> np.ndarray:
    """Encode to MP3 at given bitrate and decode back — simulates lossy compression."""
    seg = _float32_to_audiosegment(audio, sr)
    buf = io.BytesIO()
    seg.export(buf, format="mp3", bitrate=f"{bitrate_kbps}k")
    buf.seek(0)
    decoded = AudioSegment.from_file(buf, format="mp3")
    decoded = decoded.set_frame_rate(sr).set_channels(1)
    out = _audiosegment_to_float32(decoded)
    return librosa.util.fix_length(out, size=len(audio)).astype(np.float32)


def opus_roundtrip(audio: np.ndarray, bitrate_kbps: int, sr: int = 16000) -> np.ndarray:
    """Encode to Opus at given bitrate and decode back — simulates VoIP/telephony compression."""
    seg = _float32_to_audiosegment(audio, sr)
    buf = io.BytesIO()
    seg.export(buf, format="opus", bitrate=f"{bitrate_kbps}k")
    buf.seek(0)
    decoded = AudioSegment.from_file(buf, format="ogg")
    decoded = decoded.set_frame_rate(sr).set_channels(1)
    out = _audiosegment_to_float32(decoded)
    return librosa.util.fix_length(out, size=len(audio)).astype(np.float32)


# ---------------------------------------------------------------------------
# Pitch / time manipulation
# ---------------------------------------------------------------------------

def pitch_shift(audio: np.ndarray, n_semitones: float, sr: int = 16000) -> np.ndarray:
    """Shift pitch by n_semitones (positive = higher, negative = lower)."""
    return librosa.effects.pitch_shift(
        y=audio, sr=sr, n_steps=n_semitones
    ).astype(np.float32)


def time_stretch(audio: np.ndarray, rate: float) -> np.ndarray:
    """
    Stretch/compress time by `rate` (e.g. 1.1 = 10% faster, 0.9 = 10% slower).
    Output length changes — caller should re-pad/truncate to window size
    downstream (the pipeline's WindowAccumulator/VAD handles variable-length
    streams fine since it's accumulating a continuous stream anyway).
    """
    return librosa.effects.time_stretch(y=audio, rate=rate).astype(np.float32)