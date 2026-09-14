"""
Generate a fixed set of demo audio files for Janvi's dropdown demo.
Uses the existing perturbation functions against one real strong-signal
sample (fake_1) since that's the file with the clearest, most dramatic
flips in the benchmark results.
"""

import os
import numpy as np
import soundfile as sf

from src.file_loader import load_audio_file
from src.adversarial.perturbations import (
    opus_roundtrip, pitch_shift, add_pink_noise,
)

SOURCE_FILE = "data/raw/spoof_en/indic_synth_en_11/spoof_en_11.wav"  # fake_1
OUTPUT_DIR = "reports/adversarial/demo_audio"
SR = 16000

os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Loading source: {SOURCE_FILE}")
audio = load_audio_file(SOURCE_FILE)

demo_variants = {
    "clean": audio,
    "opus_compressed_16kbps": opus_roundtrip(audio, bitrate_kbps=16),
    "pink_noise_10db": add_pink_noise(audio, snr_db=10),
    "pitch_shifted_minus2": pitch_shift(audio, n_semitones=-2),
}

for name, variant in demo_variants.items():
    out_path = os.path.join(OUTPUT_DIR, f"{name}.wav")
    sf.write(out_path, variant, SR, subtype="PCM_16")
    print(f"  saved {out_path}  ({len(variant)/SR:.2f}s)")

print(f"\nAll demo files saved to {OUTPUT_DIR}/")
print("These correspond to fake_1 from the benchmark:")
print("  clean                    -> baseline 0.850 (correctly HIGH)")
print("  opus_compressed_16kbps    -> flips to ~0.362 (LOW) — evasion")
print("  pink_noise_10db           -> stays ~0.883 (HIGH) — robust here")
print("  pitch_shifted_minus2      -> flips to ~0.245 (LOW) — evasion")