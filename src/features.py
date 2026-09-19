import numpy as np
import librosa
from src.config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES, TOTAL_FEATURES

# ============================================================
# VeriVox 58-D Feature Configuration
# ============================================================

N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 13
N_CHROMA = 12

# Human vocal pitch range for YIN autocorrelation
FMIN = 65.0
FMAX = 400.0

# Pre-computed Mel filter bank matrix for fast single-pass evaluation
_MEL_BASIS = librosa.filters.mel(
    sr=SAMPLE_RATE,
    n_fft=N_FFT,
    n_mels=128,
)

# WebRTC VAD availability check
try:
    import webrtcvad
    _VAD_AVAILABLE = True
except ImportError:
    _VAD_AVAILABLE = False


def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Extract canonical 58-D VeriVox feature vector from a 1-second audio window.
    Target Execution SLA: < 5.0 ms per window.

    Layout (Indices 0..57):
        [0:13]   : 13 Base MFCCs
        [13:18]  : 5 Spectral Features (Centroid, Bandwidth, Rolloff, ZCR, RMS)
        [18:30]  : 12 Chroma STFT Bands
        [30:43]  : 13 Delta MFCCs (Velocity)
        [43:56]  : 13 Delta-Delta MFCCs (Acceleration)
        [56:58]  : 2 Pitch Statistics (Mean F0, Std Dev F0)
    """
    # --------------------------------------------------------
    # 0. Enforce exact 1.0-second array length (16,000 samples)
    # --------------------------------------------------------
    # Convert to float32 and enforce exact 1s length
    y = np.asarray(y, dtype=np.float32).reshape(-1)

    if len(y) != WINDOW_SIZE_SAMPLES:
        y = librosa.util.fix_length(y, size=WINDOW_SIZE_SAMPLES)

    # Clean extreme NaN / Inf values and clip amplitude
    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    y = np.clip(y, -1.0, 1.0)

    # --------------------------------------------------------
    # 1. Base STFT Computation
    # --------------------------------------------------------
    D = librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH)
    S = np.abs(D)
    S_power = S ** 2

    # --------------------------------------------------------
    # 2. Base 13 MFCCs
    # --------------------------------------------------------
    mel = np.dot(_MEL_BASIS, S_power)
    mel_db = librosa.power_to_db(mel + 1e-6)
    mfcc_matrix = librosa.feature.mfcc(S=mel_db, sr=sr, n_mfcc=N_MFCC)
    mfcc_matrix = np.nan_to_num(mfcc_matrix)
    mfcc = np.mean(mfcc_matrix, axis=1)

    # --------------------------------------------------------
    # 3. 5 Spectral Parameters (Modified with Flatness & High-Band)
    # --------------------------------------------------------
    # Added spectral flatness and high-frequency energy ratio calculations
    sc = float(np.mean(librosa.feature.spectral_centroid(S=S, sr=sr)))
    sb = float(np.mean(librosa.feature.spectral_bandwidth(S=S, sr=sr)))

    spec_flatness = float(np.mean(librosa.feature.spectral_flatness(S=S)))
    fft_freqs = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    high_freq_mask = fft_freqs > 6000
    total_energy = np.sum(S_power) + 1e-6
    high_freq_energy = np.sum(S_power[high_freq_mask, :])
    high_freq_ratio = float(high_freq_energy / total_energy)

    ro = float(np.mean(librosa.feature.spectral_rolloff(S=S_power, sr=sr)) * (1.0 + spec_flatness))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y, hop_length=HOP_LENGTH)))
    rms = float(np.mean(librosa.feature.rms(S=S, frame_length=N_FFT)) * (1.0 + high_freq_ratio))

    spectral = np.array([sc, sb, ro, zcr, rms], dtype=np.float32)

    # --------------------------------------------------------
    # 4. 12 Chroma Bands
    # --------------------------------------------------------
    chroma_matrix = librosa.feature.chroma_stft(
        S=S_power, sr=sr, n_fft=N_FFT, n_chroma=N_CHROMA
    )
    chroma = np.mean(np.nan_to_num(chroma_matrix), axis=1)

    # --------------------------------------------------------
    # 5. Temporal Derivatives (26 Dims)
    # --------------------------------------------------------
    delta_mfcc = np.mean(librosa.feature.delta(mfcc_matrix, order=1), axis=1)
    delta2_mfcc = np.mean(librosa.feature.delta(mfcc_matrix, order=2), axis=1)

    # --------------------------------------------------------
    # 6. WebRTC VAD Ratio
    # --------------------------------------------------------
    vad_ratio = 1.0
    if _VAD_AVAILABLE:
        try:
            vad = webrtcvad.Vad(2)
            frame_len = int(sr * 0.02)  # 20ms = 320 samples
            pcm_data = (y * 32767).astype(np.int16).tobytes()
            speech_count = 0
            total_frames = 0
            frame_bytes = frame_len * 2

            for start_idx in range(0, len(pcm_data) - frame_bytes + 1, frame_bytes):
                frame_b = pcm_data[start_idx : start_idx + frame_bytes]
                if vad.is_speech(frame_b, sr):
                    speech_count += 1
                total_frames += 1

            if total_frames > 0:
                vad_ratio = float(speech_count / total_frames)
        except Exception:
            vad_ratio = 1.0

    # --------------------------------------------------------
    # 7. Fast YIN Pitch Tracking (< 2.0 ms execution)
    # --------------------------------------------------------
    # Replaced piptrack with librosa.yin for sub-2ms execution
    try:
        f0 = librosa.yin(y, fmin=FMIN, fmax=FMAX, sr=sr, frame_length=N_FFT, hop_length=HOP_LENGTH)
        valid_f0 = f0[~np.isnan(f0)]

        if len(valid_f0) > 0:
            f0_mean = float(np.mean(valid_f0)) * vad_ratio
            f0_std = float(np.std(valid_f0))
        else:
            f0_mean, f0_std = 0.0, 0.0
    except Exception:
        f0_mean, f0_std = 0.0, 0.0

    pitch_stats = np.array([f0_mean, f0_std], dtype=np.float32)

    # --------------------------------------------------------
    # 8. Unified 58-D Vector Assembly
    # --------------------------------------------------------
    vector = np.concatenate(
        [
            mfcc,         # [0:13]   (13)
            spectral,     # [13:18]  (5)
            chroma,       # [18:30]  (12)
            delta_mfcc,   # [30:43]  (13)
            delta2_mfcc,  # [43:56]  (13)
            pitch_stats,  # [56:58]  (2)
        ]
    ).astype(np.float32)

    vector = np.nan_to_num(vector, nan=0.0, posinf=0.0, neginf=0.0)

    assert vector.shape == (TOTAL_FEATURES,), f"Expected ({TOTAL_FEATURES},), got {vector.shape}"
    return vector