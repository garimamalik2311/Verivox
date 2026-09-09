import numpy as np
import librosa
from src.config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES, TOTAL_FEATURES

def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Optimized 30-D feature extractor reusing a single STFT computation.
    Expected output: 1D np.ndarray of shape (30,) float32.
    """
    if len(y) != WINDOW_SIZE_SAMPLES:
        y = librosa.util.fix_length(data=y, size=WINDOW_SIZE_SAMPLES)

    n_fft = 1024
    hop_length = 512

    # 1. Single STFT & Power Spectrogram computation
    D = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
    S = np.abs(D)
    S_power = S ** 2

    # 2. 13 MFCCs (computed from power spectrogram)
    mel_basis = librosa.feature.melspectrogram(S=S_power, sr=sr, n_fft=n_fft, hop_length=hop_length)
    mfcc = np.mean(librosa.feature.mfcc(S=librosa.power_to_db(mel_basis), sr=sr, n_mfcc=13), axis=1)

    # 3. 5 Spectral features (passing frame_length=n_fft to rms)
    sc = np.mean(librosa.feature.spectral_centroid(S=S, sr=sr))
    sb = np.mean(librosa.feature.spectral_bandwidth(S=S, sr=sr))
    ro = np.mean(librosa.feature.spectral_rolloff(S=S_power, sr=sr))
    zcr = np.mean(librosa.feature.zero_crossing_rate(y=y, hop_length=hop_length))
    rms = np.mean(librosa.feature.rms(S=S, frame_length=n_fft))

    # 4. 12 Chroma features (reusing power spectrum)
    chroma = np.mean(librosa.feature.chroma_stft(S=S_power, sr=sr, n_fft=n_fft, n_chroma=12), axis=1)

    # 5. Concatenate to 30-D vector
    vector = np.concatenate([mfcc, [sc, sb, ro, zcr, rms], chroma]).astype(np.float32)
    assert vector.shape == (TOTAL_FEATURES,), f"Expected ({TOTAL_FEATURES},), got {vector.shape}"
    return vector