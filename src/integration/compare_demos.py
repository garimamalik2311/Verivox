import asyncio
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import websockets

WEBSOCKET_URL = "ws://127.0.0.1:8000/ws/audio"
SAMPLE_RATE = 16000
CHUNK_SAMPLES = 320


def load_audio(path):
    audio, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    if audio.size == 0:
        raise ValueError(f"Empty audio: {path}")
    return audio.astype(np.float32)


def float_to_pcm16(audio):
    audio = np.clip(audio, -1.0, 1.0)
    return (audio * 32767).astype(np.int16).tobytes()


async def analyze(path, stream_id):
    audio = load_audio(path)
    probabilities = []
    risk_levels = []
    alerts = []

    async with websockets.connect(
        f"{WEBSOCKET_URL}?stream_id={stream_id}"
    ) as websocket:

        for start in range(0, len(audio), CHUNK_SAMPLES):
            chunk = audio[start:start + CHUNK_SAMPLES]

            if len(chunk) < CHUNK_SAMPLES:
                chunk = np.pad(
                    chunk,
                    (0, CHUNK_SAMPLES - len(chunk))
                )

            await websocket.send(float_to_pcm16(chunk))

            try:
                while True:
                    result = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=0.001
                    )
                    data = json.loads(result)

                    if "ai_probability" in data:
                        probabilities.append(
                            float(data["ai_probability"])
                        )
                        risk_levels.append(data["risk_level"])

                        if data["alert_triggered"]:
                            alerts.append(data)

            except asyncio.TimeoutError:
                pass

            await asyncio.sleep(0.01)

        await asyncio.sleep(1)

        try:
            while True:
                result = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=0.5
                )
                data = json.loads(result)

                if "ai_probability" in data:
                    probabilities.append(
                        float(data["ai_probability"])
                    )
                    risk_levels.append(data["risk_level"])

                    if data["alert_triggered"]:
                        alerts.append(data)

        except asyncio.TimeoutError:
            pass

    p = np.array(probabilities)

    return {
        "windows": len(p),
        "mean": float(np.mean(p)),
        "max": float(np.max(p)),
        "over_0.5": float(np.mean(p > 0.5) * 100),
        "over_0.7": float(np.mean(p > 0.7) * 100),
        "over_0.8": float(np.mean(p > 0.8) * 100),
        "medium_windows": risk_levels.count("MEDIUM"),
        "high_windows": risk_levels.count("HIGH"),
        "alerts": len(alerts),
    }


async def main():
    files = {
        "Real voice": "demo/real_voice.wav",
        "Clone #1": "demo/cloned_voice.wav",
        "Clone #2": "demo/cloned_voice2.wav",
    }

    print("\nVeriVox Demo Comparison")
    print("=" * 75)

    results = {}

    for name, filename in files.items():
        if not Path(filename).exists():
            print(f"\nSkipping {name}: {filename} not found")
            continue

        print(f"\nAnalyzing {name}...")
        stream_id = (
            name.lower()
            .replace(" ", "_")
            .replace("#", "")
        )

        results[name] = await analyze(filename, stream_id)

    print("\n\nRESULTS")
    print("=" * 75)

    header = (
        f"{'Audio':<15}"
        f"{'Windows':>8}"
        f"{'Mean':>10}"
        f"{'Max':>10}"
        f"{'>0.5':>10}"
        f"{'>0.7':>10}"
        f"{'>0.8':>10}"
        f"{'HIGH':>8}"
        f"{'Alerts':>8}"
    )

    print(header)
    print("-" * 75)

    for name, r in results.items():
        print(
            f"{name:<15}"
            f"{r['windows']:>8}"
            f"{r['mean']:>10.3f}"
            f"{r['max']:>10.3f}"
            f"{r['over_0.5']:>9.1f}%"
            f"{r['over_0.7']:>9.1f}%"
            f"{r['over_0.8']:>9.1f}%"
            f"{r['high_windows']:>8}"
            f"{r['alerts']:>8}"
        )

    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(main())
