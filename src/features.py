import numpy as np
import librosa

from src.config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES

# MODIFIED BY PERSON B: Updated total feature dimension from 30-D to 58-D
TOTAL_FEATURES = 58

N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 13
N_CHROMA = 12

# Standard Mel basis for baseline MFCCs
MIN_F0 = 70.0
MAX_F0 = 500.0

_MEL_BASIS = librosa.filters.mel(
    sr=SAMPLE_RATE,
    n_fft=N_FFT,
    n_mels=128,
)

# ADDED BY PERSON B: WebRTC VAD check for speech/pause duration ratio calculation
try:
    import webrtcvad
    _VAD_AVAILABLE = True
except ImportError:
    _VAD_AVAILABLE = False


def _extract_f0_stats(y: np.ndarray, sr: int):
    try:
        pitches, magnitudes = librosa.piptrack(
            y=y,
            sr=sr,
            n_fft=N_FFT,
            hop_length=HOP_LENGTH,
            fmin=MIN_F0,
            fmax=MAX_F0,
        )

        frame_f0 = []

        for frame_idx in range(pitches.shape[1]):
            pitch_column = pitches[:, frame_idx]
            magnitude_column = magnitudes[:, frame_idx]

            valid = (
                (pitch_column >= MIN_F0)
                & (pitch_column <= MAX_F0)
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
            return 0.0, 0.0

        frame_f0 = np.asarray(frame_f0, dtype=np.float32)

        frame_f0 = frame_f0[
            (frame_f0 >= MIN_F0)
            & (frame_f0 <= MAX_F0)
        ]

        if len(frame_f0) == 0:
            return 0.0, 0.0

        median_f0 = np.median(frame_f0)

        lower = max(MIN_F0, median_f0 * 0.5)
        upper = min(MAX_F0, median_f0 * 1.8)

        filtered_f0 = frame_f0[
            (frame_f0 >= lower)
            & (frame_f0 <= upper)
        ]

        if len(filtered_f0) == 0:
            filtered_f0 = frame_f0

        return (
            float(np.mean(filtered_f0)),
            float(np.std(filtered_f0)),
        )

    except Exception:
        return 0.0, 0.0


def _calculate_vad_ratio(y: np.ndarray, sr: int) -> float:
    if not _VAD_AVAILABLE:
        return 1.0

    try:
        vad = webrtcvad.Vad(2)

        frame_len = int(sr * 0.02)
        y_pcm = np.clip(y, -1.0, 1.0)
        pcm_data = (y_pcm * 32767).astype(np.int16).tobytes()

        frame_bytes = frame_len * 2
        speech_count = 0
        total_frames = 0

        for start in range(
            0,
            len(pcm_data) - frame_bytes + 1,
            frame_bytes,
        ):
            frame = pcm_data[start:start + frame_bytes]

            try:
                if vad.is_speech(frame, sr):
                    speech_count += 1
                total_frames += 1
            except Exception:
                continue

        if total_frames == 0:
            return 1.0

        return float(speech_count / total_frames)

    except Exception:
        return 1.0


def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Extract the 58-D VeriVox feature vector (Extended from 30-D).

    Feature Layout (Indices 0..57):
        [0:13]   : 13 Base MFCCs
        [13:18]  : 5 Spectral Features (Centroid, Bandwidth, Rolloff, ZCR, RMS)
        [18:30]  : 12 Chroma STFT Bands
        [30:43]  : 13 Delta MFCCs (First derivative)          - ADDED BY PERSON B
        [43:56]  : 13 Delta-Delta MFCCs (Second derivative)    - ADDED BY PERSON B
        [56:58]  : 2 Pitch F0 Statistics (Mean, Std Dev)       - ADDED BY PERSON B

    Execution target: < 5.0 ms per 1.0 s window.
    """
    if len(y) != WINDOW_SIZE_SAMPLES:
        y = librosa.util.fix_length(
            data=y,
            size=WINDOW_SIZE_SAMPLES,
        )

    # 1. Base STFT shared by spectral features, MFCCs, and Chroma
    D = librosa.stft(
        y,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    S = np.abs(D)
    S_power = S ** 2

    # --- 13 Base MFCCs ---
    mel = np.dot(_MEL_BASIS, S_power)
    mel_db = librosa.power_to_db(
        mel + 1e-10,
        ref=np.max,
    )
    mfcc_matrix = librosa.feature.mfcc(
        S=mel_db,
        sr=sr,
        n_mfcc=N_MFCC,
    )
    mfcc = np.mean(mfcc_matrix, axis=1)

    # --- 5 Spectral Features (Modified with spectral flatness & high-band energy ratio) ---
    # Spectral centroid + bandwidth
    # Compute centroid once and reuse it for bandwidth.
    fft_freqs = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    S_sum = np.sum(S, axis=0, keepdims=True) + 1e-10

    centroid_frames = np.sum(
        fft_freqs[:, None] * S,
        axis=0,
        keepdims=True,
    ) / S_sum

    sc = np.mean(centroid_frames)

    deviation = np.abs(
        fft_freqs[:, None] - centroid_frames
    )

    bandwidth_frames = np.sqrt(
        np.sum(
            S * deviation ** 2,
            axis=0,
            keepdims=True,
        ) / S_sum
    )

    sb = np.mean(bandwidth_frames)

    # ADDED BY PERSON B: Vocoder high-band (>6kHz) and spectral flatness modifiers
    spec_flatness = np.mean(librosa.feature.spectral_flatness(S=S))
    fft_freqs = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    high_freq_mask = fft_freqs > 6000
    total_energy = np.sum(S_power) + 1e-6
    high_freq_energy = np.sum(S_power[high_freq_mask, :])
    high_freq_ratio = high_freq_energy / total_energy

    ro = np.mean(librosa.feature.spectral_rolloff(S=S_power, sr=sr)) * (1.0 + spec_flatness) # MODIFIED BY PERSON B
    zcr = np.mean(librosa.feature.zero_crossing_rate(y=y, hop_length=HOP_LENGTH))
    rms = np.mean(librosa.feature.rms(S=S, frame_length=N_FFT)) * (1.0 + high_freq_ratio)  # MODIFIED BY PERSON B

    # --- 12 Chroma Features ---
    chroma = np.mean(
        librosa.feature.chroma_stft(
            S=S_power,
            sr=sr,
            n_fft=N_FFT,
            n_chroma=N_CHROMA,
        ),
        axis=1,
    )

    # --- ADDED BY PERSON B: 13 Delta & 13 Delta-Delta MFCCs ---
    delta_mfcc = np.mean(librosa.feature.delta(mfcc_matrix), axis=1)
    delta2_mfcc = np.mean(librosa.feature.delta(mfcc_matrix, order=2), axis=1)

    # --- 2 Pitch F0 Statistics & VAD Speech Ratio ---
    f0_mean, f0_std = _extract_f0_stats(
        y,
        sr,
    )

    vad_ratio = _calculate_vad_ratio(
        y,
        sr,
    )

    # Preserve the known-good low-speech gate.
    if vad_ratio < 0.10:
        f0_mean = 0.0
        f0_std = 0.0

    pitch_stats = np.array(
        [
            f0_mean,
            f0_std,
        ],
        dtype=np.float32,
    )

    vector = np.concatenate(
        [
            mfcc,                  # [0:13]   (13)
            [sc, sb, ro, zcr, rms],# [13:18]  (5)
            chroma,                # [18:30]  (12)
            delta_mfcc,            # [30:43]  (13) - ADDED BY PERSON B
            delta2_mfcc,           # [43:56]  (13) - ADDED BY PERSON B
            pitch_stats            # [56:58]  (2)  - ADDED BY PERSON B
        ]
    ).astype(np.float32)

    assert vector.shape == (
        TOTAL_FEATURES,
    ), f"Expected ({TOTAL_FEATURES},), got {vector.shape}"

    return vector