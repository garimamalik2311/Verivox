"""
Central config for the voice ingestion pipeline.
Every other module imports constants from here — never hardcode these values elsewhere.
"""

# --- Audio format ---
SAMPLE_RATE = 16000          # Hz — all audio gets resampled to this
CHANNELS = 1                 # mono

# --- Windowing ---
WINDOW_DURATION_SEC = 1.0    # length of each analysis window
WINDOW_OVERLAP = 0.5         # 50% overlap between consecutive windows

WINDOW_SIZE_SAMPLES = int(SAMPLE_RATE * WINDOW_DURATION_SEC)          # 16000 samples
WINDOW_STRIDE_SAMPLES = int(WINDOW_SIZE_SAMPLES * (1 - WINDOW_OVERLAP))  # 8000 samples

# --- VAD (Voice Activity Detection) ---
VAD_FRAME_MS = 20            # webrtcvad requires 10, 20, or 30 ms frames
VAD_FRAME_SAMPLES = int(SAMPLE_RATE * VAD_FRAME_MS / 1000)  # 320 samples
VAD_AGGRESSIVENESS = 2       # 0 (lenient) to 3 (aggressive) — how strictly to filter non-speech

# --- Supported input formats ---
SUPPORTED_FORMATS = (".wav", ".mp3", ".m4a", ".ogg", ".flac")
