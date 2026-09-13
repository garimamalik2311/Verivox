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
    mel_db = librosa.power_to_db(mel + 1e-6)
    mfcc_matrix = librosa.feature.mfcc(
        S=mel_db,
        sr=sr,
        n_mfcc=N_MFCC,
    )
    mfcc = np.mean(mfcc_matrix, axis=1)

    # --- 5 Spectral Features (Modified with spectral flatness & high-band energy ratio) ---
    sc = np.mean(librosa.feature.spectral_centroid(S=S, sr=sr))
    sb = np.mean(librosa.feature.spectral_bandwidth(S=S, sr=sr))
    
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

    # --- ADDED BY PERSON B: 2 Pitch F0 Statistics & VAD Speech Ratio ---
    pitches, _ = librosa.piptrack(y=y, sr=sr)
    f0 = pitches[pitches > 0]
    
    vad_ratio = 1.0
    if _VAD_AVAILABLE:
        try:
            vad = webrtcvad.Vad(2)
            frame_len = int(sr * 0.02)  # 20ms = 320 samples
            pcm_data = (y * 32767).astype(np.int16).tobytes()
            speech_count = 0
            total_frames = 0
            for i in range(0, len(pcm_data) - frame_len * 2 + 1, frame_len * 2):
                frame = pcm_data[i:i + frame_len * 2]
                if vad.is_speech(frame, sr):
                    speech_count += 1
                total_frames += 1
            if total_frames > 0:
                vad_ratio = speech_count / total_frames
        except Exception:
            vad_ratio = 1.0

    f0_mean = (np.mean(f0) if len(f0) > 0 else 0.0) * vad_ratio
    f0_std = np.std(f0) if len(f0) > 0 else 0.0
    pitch_stats = np.array([f0_mean, f0_std], dtype=np.float32)

    # MODIFIED BY PERSON B: Concatenate all into a unified 58-D Float32 vector
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