import numpy as np
import librosa

from src.config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES, TOTAL_FEATURES


N_FFT = 1024
HOP_LENGTH = 512
N_MFCC = 13
N_CHROMA = 12


# These parameters are fixed for the VeriVox 30-D feature contract.
# Build the deterministic Mel filter bank once instead of rebuilding it
# for every 1-second inference window.
_MEL_BASIS = librosa.filters.mel(
    sr=SAMPLE_RATE,
    n_fft=N_FFT,
    n_mels=128,
)


def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Extract the canonical 30-D VeriVox feature vector.

    Feature order:
        13 MFCC
        5 spectral features
        12 chroma

    The feature definitions and ordering must remain compatible with
    the calibrated XGBoost model.
    """
    if len(y) != WINDOW_SIZE_SAMPLES:
        y = librosa.util.fix_length(
            data=y,
            size=WINDOW_SIZE_SAMPLES,
        )

    # Single STFT shared by the spectral features, MFCC and chroma.
    D = librosa.stft(
        y,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    S = np.abs(D)
    S_power = S ** 2

    # 1. 13 MFCCs
    # Reuse the precomputed Mel filter bank instead of constructing it
    # on every inference call.
    mel = np.dot(_MEL_BASIS, S_power)
    mel_db = librosa.power_to_db(mel)
    mfcc = np.mean(
        librosa.feature.mfcc(
            S=mel_db,
            sr=sr,
            n_mfcc=N_MFCC,
        ),
        axis=1,
    )

    # 2. Five spectral features
    sc = np.mean(
        librosa.feature.spectral_centroid(
            S=S,
            sr=sr,
        )
    )

    sb = np.mean(
        librosa.feature.spectral_bandwidth(
            S=S,
            sr=sr,
        )
    )

    ro = np.mean(
        librosa.feature.spectral_rolloff(
            S=S_power,
            sr=sr,
        )
    )

    zcr = np.mean(
        librosa.feature.zero_crossing_rate(
            y=y,
            hop_length=HOP_LENGTH,
        )
    )

    rms = np.mean(
        librosa.feature.rms(
            S=S,
            frame_length=N_FFT,
        )
    )

    # 3. 12 chroma features
    chroma = np.mean(
        librosa.feature.chroma_stft(
            S=S_power,
            sr=sr,
            n_fft=N_FFT,
            n_chroma=N_CHROMA,
        ),
        axis=1,
    )

    # 4. Canonical 30-D vector
    vector = np.concatenate(
        [
            mfcc,
            [sc, sb, ro, zcr, rms],
            chroma,
        ]
    ).astype(np.float32)

    assert vector.shape == (
        TOTAL_FEATURES,
    ), f"Expected ({TOTAL_FEATURES},), got {vector.shape}"

    return vector
