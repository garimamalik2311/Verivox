"""
Central config for the voice ingestion pipeline.
Every other module imports constants from here — never hardcode these values elsewhere.
"""

# --- Audio format ---
SAMPLE_RATE = 16000          # Hz — standard telephony/ASR baseline
CHANNELS = 1                 # Mono PCM

# --- Windowing ---
WINDOW_DURATION_SEC = 1.0    # Duration of analysis window
WINDOW_OVERLAP = 0.5         # 50% overlap between consecutive windows

WINDOW_SIZE_SAMPLES = int(SAMPLE_RATE * WINDOW_DURATION_SEC)           # 16,000 samples
WINDOW_STRIDE_SAMPLES = int(WINDOW_SIZE_SAMPLES * (1 - WINDOW_OVERLAP)) #  8,000 samples (hop length)

# --- VAD (Voice Activity Detection) ---
VAD_FRAME_MS = 20            # WebRTC VAD valid frame lengths: 10, 20, or 30 ms
VAD_FRAME_SAMPLES = int(SAMPLE_RATE * VAD_FRAME_MS / 1000)   # 320 samples
VAD_AGGRESSIVENESS = 2       # 0 (lenient) to 3 (aggressive)

# --- Feature Extraction Vector Shapes ---
NUM_MFCC = 13
NUM_SPECTRAL = 5             # Centroid, Bandwidth, Rolloff, ZCR, RMS
NUM_CHROMA = 12
TOTAL_FEATURES = NUM_MFCC + NUM_SPECTRAL + NUM_CHROMA        # 30-D representation

# --- Supported input formats ---
SUPPORTED_FORMATS = (".wav", ".mp3", ".m4a", ".ogg", ".flac")