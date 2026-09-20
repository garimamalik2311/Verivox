import numpy as np
import librosa
from src.config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES, TOTAL_FEATURES

N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 13
N_CHROMA = 12
FMIN = 65.0
FMAX = 400.0

_MEL_BASIS = librosa.filters.mel(
    sr=SAMPLE_RATE,
    n_fft=N_FFT,
    n_mels=128,
)

try:
    import webrtcvad
    _VAD_AVAILABLE = True
except ImportError:
    _VAD_AVAILABLE = False


def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    y = np.asarray(y, dtype=np.float32).reshape(-1)

    if len(y) != WINDOW_SIZE_SAMPLES:
        y = librosa.util.fix_length(y, size=WINDOW_SIZE_SAMPLES)

    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    y = np.clip(y, -1.0, 1.0)

    # Base STFT
    D = librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH)
    S = np.abs(D)
    S_power = S ** 2
    nyquist = sr / 2.0  # 8000 Hz for 16 kHz audio

    # Base 13 MFCCs
    mel = np.dot(_MEL_BASIS, S_power)
    mel_db = librosa.power_to_db(mel + 1e-6)
    mfcc_matrix = librosa.feature.mfcc(S=mel_db, sr=sr, n_mfcc=N_MFCC)
    mfcc_matrix = np.nan_to_num(mfcc_matrix)
    mfcc = np.mean(mfcc_matrix, axis=1)

    # 5 Spectral Parameters (Normalized by Nyquist)
    sc = float(np.mean(librosa.feature.spectral_centroid(S=S, sr=sr))) / nyquist
    sb = float(np.mean(librosa.feature.spectral_bandwidth(S=S, sr=sr))) / nyquist
    ro = float(np.mean(librosa.feature.spectral_rolloff(S=S_power, sr=sr))) / nyquist
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y, hop_length=HOP_LENGTH)))
    rms = float(np.mean(librosa.feature.rms(S=S, frame_length=1024)))

    spectral = np.array([sc, sb, ro, zcr, rms], dtype=np.float32)

    # 12 Chroma Bands
    chroma_matrix = librosa.feature.chroma_stft(
        S=S_power, sr=sr, n_fft=N_FFT, n_chroma=N_CHROMA
    )
    chroma = np.mean(np.nan_to_num(chroma_matrix), axis=1)

    # Temporal Derivatives
    delta_mfcc = np.mean(librosa.feature.delta(mfcc_matrix, order=1), axis=1)
    delta2_mfcc = np.mean(librosa.feature.delta(mfcc_matrix, order=2), axis=1)

    # WebRTC VAD
    vad_ratio = 1.0
    if _VAD_AVAILABLE:
        try:
            vad = webrtcvad.Vad(2)
            frame_len = int(sr * 0.02)
            pcm_data = (np.clip(y, -1.0, 1.0) * 32767.0).astype(np.int16).tobytes()
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

    # Fast YIN Pitch Tracking
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

    # 58-D Vector Assembly
    vector = np.concatenate(
        [
            mfcc,
            spectral,
            chroma,
            delta_mfcc,
            delta2_mfcc,
            pitch_stats,
        ]
    ).astype(np.float32)

    vector = np.nan_to_num(vector, nan=0.0, posinf=0.0, neginf=0.0)

    assert vector.shape == (TOTAL_FEATURES,), f"Expected ({TOTAL_FEATURES},), got {vector.shape}"
    return vector