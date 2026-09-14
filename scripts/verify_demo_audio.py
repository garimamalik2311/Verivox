"""Verify the 4 pre-generated demo files reproduce expected probabilities."""

import asyncio
import numpy as np

from src.file_loader import load_audio_file
from src.adversarial.ws_client import send_audio_and_collect

DEMO_FILES = {
    "clean": ("reports/adversarial/demo_audio/clean.wav", 0.850),
    "opus_compressed_16kbps": ("reports/adversarial/demo_audio/opus_compressed_16kbps.wav", 0.362),
    "pink_noise_10db": ("reports/adversarial/demo_audio/pink_noise_10db.wav", 0.883),
    "pitch_shifted_minus2": ("reports/adversarial/demo_audio/pitch_shifted_minus2.wav", 0.245),
}


async def main():
    for name, (path, expected) in DEMO_FILES.items():
        audio = load_audio_file(path)
        results = await send_audio_and_collect(audio, stream_id=f"verify_{name}")
        if not results:
            print(f"{name}: ⚠️  no results returned")
            continue
        avg_prob = np.mean([r["ai_probability"] for r in results])
        diff = abs(avg_prob - expected)
        status = "✅" if diff < 0.05 else "⚠️  DRIFTED"
        print(f"{name}: got {avg_prob:.3f}, expected ~{expected:.3f}  {status}")


if __name__ == "__main__":
    asyncio.run(main())