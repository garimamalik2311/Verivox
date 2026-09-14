import numpy as np
import librosa

from src.config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES

# ============================================================
# VeriVox Feature Configuration
# ============================================================

TOTAL_FEATURES = 58

N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 13
N_CHROMA = 12

# Human voice F0 range.
# Keeping this bounded prevents piptrack octave/high-frequency
# errors from dominating the ML features.
MIN_F0 = 70.0
MAX_F0 = 500.0

# ============================================================
# Pre-computed Mel Filter Bank
# ============================================================

_MEL_BASIS = librosa.filters.mel(
    sr=SAMPLE_RATE,
    n_fft=N_FFT,
    n_mels=128,
)

# ============================================================
# Optional WebRTC VAD
# ============================================================

try:
    import webrtcvad

    _VAD_AVAILABLE = True

except ImportError:
    _VAD_AVAILABLE = False


# ============================================================
# Helper: Robust F0 Extraction
# ============================================================

def _extract_f0_stats(y: np.ndarray, sr: int):
    """
    Extract robust pitch statistics.

    IMPORTANT:
    piptrack returns a pitch candidate matrix, not one F0 value.
    We select the strongest pitch candidate for each frame and
    discard values outside a realistic human-voice range.
    """

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

            # Pick the pitch candidate with the highest magnitude.
            best_idx = np.argmax(valid_magnitudes)
            best_pitch = valid_pitches[best_idx]

            if np.isfinite(best_pitch):
                frame_f0.append(best_pitch)

        if len(frame_f0) == 0:
            return 0.0, 0.0

        frame_f0 = np.asarray(frame_f0, dtype=np.float32)

        # Remove extreme octave/outlier values.
        frame_f0 = frame_f0[
            (frame_f0 >= MIN_F0)
            & (frame_f0 <= MAX_F0)
        ]

        if len(frame_f0) == 0:
            return 0.0, 0.0

        # Median-based filtering makes pitch statistics much more stable.
        median_f0 = np.median(frame_f0)

        lower = max(MIN_F0, median_f0 * 0.5)
        upper = min(MAX_F0, median_f0 * 1.8)

        filtered_f0 = frame_f0[
            (frame_f0 >= lower)
            & (frame_f0 <= upper)
        ]

        if len(filtered_f0) == 0:
            filtered_f0 = frame_f0

        f0_mean = float(np.mean(filtered_f0))
        f0_std = float(np.std(filtered_f0))

        return f0_mean, f0_std

    except Exception:
        return 0.0, 0.0


# ============================================================
# Helper: Voice Activity Ratio
# ============================================================

def _calculate_vad_ratio(y: np.ndarray, sr: int) -> float:
    """
    Calculate approximate speech-to-total duration ratio.

    This value is currently NOT included in the 58-D feature vector.
    It is only used internally for pitch confidence.
    """

    if not _VAD_AVAILABLE:
        return 1.0

    try:
        vad = webrtcvad.Vad(2)

        # WebRTC VAD supports 10, 20, or 30 ms.
        frame_len = int(sr * 0.02)

        # Ensure valid PCM range.
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

            frame = pcm_data[
                start:start + frame_bytes
            ]

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


# ============================================================
# Main Feature Extraction
# ============================================================

def extract_features(
    y: np.ndarray,
    sr: int = SAMPLE_RATE,
) -> np.ndarray:
    """
    Extract the 58-D VeriVox feature vector.

    Feature layout:

        [0:13]   -> 13 MFCCs
        [13:18]  -> 5 spectral features
                    centroid
                    bandwidth
                    rolloff
                    zero-crossing rate
                    RMS

        [18:30]  -> 12 chroma features

        [30:43]  -> 13 delta MFCCs

        [43:56]  -> 13 delta-delta MFCCs

        [56:58]  -> 2 pitch statistics
                    mean F0
                    standard deviation F0
    """

    # --------------------------------------------------------
    # 0. Input validation
    # --------------------------------------------------------

    y = np.asarray(y, dtype=np.float32)

    if y.ndim > 1:
        y = np.mean(y, axis=-1)

    # Remove NaN / Inf values.
    y = np.nan_to_num(
        y,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    # Ensure exact window size.
    if len(y) != WINDOW_SIZE_SAMPLES:
        y = librosa.util.fix_length(
            y,
            size=WINDOW_SIZE_SAMPLES,
        )

    # Prevent unexpected clipping.
    y = np.clip(y, -1.0, 1.0)

    # --------------------------------------------------------
    # 1. STFT
    # --------------------------------------------------------

    D = librosa.stft(
        y,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        center=True,
    )

    S = np.abs(D)
    S_power = S ** 2

    # Avoid numerical problems.
    S = np.nan_to_num(S)
    S_power = np.nan_to_num(S_power)

    # --------------------------------------------------------
    # 2. MFCC
    # --------------------------------------------------------

    mel = np.dot(
        _MEL_BASIS,
        S_power,
    )

    mel_db = librosa.power_to_db(
        mel + 1e-10,
        ref=np.max,
    )

    mfcc_matrix = librosa.feature.mfcc(
        S=mel_db,
        sr=sr,
        n_mfcc=N_MFCC,
    )

    mfcc_matrix = np.nan_to_num(mfcc_matrix)

    mfcc = np.mean(
        mfcc_matrix,
        axis=1,
    )

    # --------------------------------------------------------
    # 3. Spectral Features
    # --------------------------------------------------------

    nyquist = sr / 2.0

    # Spectral centroid
    spectral_centroid = librosa.feature.spectral_centroid(
        S=S,
        sr=sr,
    )

    sc = float(
        np.mean(spectral_centroid) / nyquist
    )

    # Spectral bandwidth
    spectral_bandwidth = librosa.feature.spectral_bandwidth(
        S=S,
        sr=sr,
    )

    sb = float(
        np.mean(spectral_bandwidth) / nyquist
    )

    # Spectral rolloff
    spectral_rolloff = librosa.feature.spectral_rolloff(
        S=S_power,
        sr=sr,
        roll_percent=0.85,
    )

    # IMPORTANT:
    # Do NOT multiply rolloff by spectral flatness.
    ro = float(
        np.mean(spectral_rolloff) / nyquist
    )

    # Zero crossing rate
    zcr = float(
        np.mean(
            librosa.feature.zero_crossing_rate(
                y,
                hop_length=HOP_LENGTH,
            )
        )
    )

    # RMS energy
    rms_features = librosa.feature.rms(
        S=S,
        frame_length=N_FFT,
    )

    rms = float(
        np.mean(rms_features)
    )

    # --------------------------------------------------------
    # 4. Chroma
    # --------------------------------------------------------

    chroma_matrix = librosa.feature.chroma_stft(
        S=S_power,
        sr=sr,
        n_fft=N_FFT,
        n_chroma=N_CHROMA,
    )

    chroma_matrix = np.nan_to_num(
        chroma_matrix
    )

    chroma = np.mean(
        chroma_matrix,
        axis=1,
    )

    # --------------------------------------------------------
    # 5. Delta MFCC
    # --------------------------------------------------------

    delta_mfcc_matrix = librosa.feature.delta(
        mfcc_matrix,
        order=1,
    )

    delta_mfcc = np.mean(
        delta_mfcc_matrix,
        axis=1,
    )

    # --------------------------------------------------------
    # 6. Delta-Delta MFCC
    # --------------------------------------------------------

    delta2_mfcc_matrix = librosa.feature.delta(
        mfcc_matrix,
        order=2,
    )

    delta2_mfcc = np.mean(
        delta2_mfcc_matrix,
        axis=1,
    )

    # --------------------------------------------------------
    # 7. Pitch
    # --------------------------------------------------------

    f0_mean, f0_std = _extract_f0_stats(
        y,
        sr,
    )

    # VAD can be used to reduce confidence on windows
    # containing very little speech.
    vad_ratio = _calculate_vad_ratio(
        y,
        sr,
    )

    # If there is almost no speech, don't produce
    # misleading pitch statistics.
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

    # --------------------------------------------------------
    # 8. Final 58-D vector
    # --------------------------------------------------------

    vector = np.concatenate(
        [
            mfcc,                   # 13
            np.array(
                [
                    sc,
                    sb,
                    ro,
                    zcr,
                    rms,
                ],
                dtype=np.float32,
            ),                       # 5
            chroma,                  # 12
            delta_mfcc,              # 13
            delta2_mfcc,             # 13
            pitch_stats,             # 2
        ]
    ).astype(np.float32)

    # --------------------------------------------------------
    # 9. Safety checks
    # --------------------------------------------------------

    vector = np.nan_to_num(
        vector,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    assert vector.shape == (
        TOTAL_FEATURES,
    ), (
        f"Expected ({TOTAL_FEATURES},), "
        f"got {vector.shape}"
    )

    return vector