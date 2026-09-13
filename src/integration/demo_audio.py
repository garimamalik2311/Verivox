import asyncio
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import websockets

from src.vad import VoiceActivityDetector
from src.window_accumulator import WindowAccumulator


WEBSOCKET_URL = "ws://127.0.0.1:8000/ws/audio"
STREAM_ID = "demo_audio_001"

SAMPLE_RATE = 16000
CHUNK_SAMPLES = 320  # 20 ms at 16 kHz


def load_audio(path: str) -> np.ndarray:
    """Load audio as mono float32 at 16 kHz."""
    audio, _ = librosa.load(
        path,
        sr=SAMPLE_RATE,
        mono=True,
    )

    if audio.size == 0:
        raise ValueError(f"Audio file is empty: {path}")

    return audio.astype(np.float32)


def float_to_pcm16(audio: np.ndarray) -> bytes:
    """Convert float audio [-1, 1] to PCM16 bytes."""
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)
    return pcm.tobytes()


async def run_demo(audio_path: str) -> None:
    path = Path(audio_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    print(f"Loading: {path}")

    audio = load_audio(str(path))

    print(f"Duration: {len(audio) / SAMPLE_RATE:.2f}s")
    print("Connecting to VeriVox /ws/audio...")

    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()

    async with websockets.connect(
        f"{WEBSOCKET_URL}?stream_id={STREAM_ID}"
    ) as websocket:

        print("Connected.")
        print("Streaming audio...\n")

        # Send audio in the same 20 ms chunks used by the live microphone path.
        for start in range(0, len(audio), CHUNK_SAMPLES):
            chunk = audio[start:start + CHUNK_SAMPLES]

            if len(chunk) < CHUNK_SAMPLES:
                chunk = np.pad(
                    chunk,
                    (0, CHUNK_SAMPLES - len(chunk)),
                )

            # Send the raw PCM16 audio to the backend.
            await websocket.send(float_to_pcm16(chunk))

            # Give the backend time to process and return RiskResults.
            try:
                while True:
                    result = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=0.001,
                    )

                    data = json.loads(result)

                    if "risk_level" in data:
                        print(
                            f"Window {data['window_id']:>2} | "
                            f"AI={data['ai_probability']:.3f} | "
                            f"Rolling={data['rolling_score']:.3f} | "
                            f"Risk={data['risk_level']} | "
                            f"Alert={data['alert_triggered']}"
                        )

            except asyncio.TimeoutError:
                pass

            await asyncio.sleep(0.01)

        # Allow final windows/results to arrive.
        await asyncio.sleep(1.0)

        try:
            while True:
                result = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=0.5,
                )

                data = json.loads(result)

                if "risk_level" in data:
                    print(
                        f"Window {data['window_id']:>2} | "
                        f"AI={data['ai_probability']:.3f} | "
                        f"Rolling={data['rolling_score']:.3f} | "
                        f"Risk={data['risk_level']} | "
                        f"Alert={data['alert_triggered']}"
                    )

        except asyncio.TimeoutError:
            pass

    print("\nDemo complete.")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage:")
        print("  python -m src.integration.demo_audio <audio_file>")
        sys.exit(1)

    asyncio.run(run_demo(sys.argv[1]))


if __name__ == "__main__":
    main()
