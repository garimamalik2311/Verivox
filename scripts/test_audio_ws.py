"""Minimal client for /ws/audio."""

import asyncio
import json
import sys

import librosa
import numpy as np
import websockets

from src.config import SAMPLE_RATE

AUDIO_FILE = "data/WhatsApp Ptt 2026-09-09 at 4.11.59 PM.ogg"
WS_URL = "ws://127.0.0.1:8000/ws/audio?stream_id=audio_test_001"

CHUNK_SAMPLES = 1600
RECV_TIMEOUT = 15.0


def load_pcm16(path: str):
    y, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    y = np.clip(y, -1.0, 1.0)
    pcm16 = (y * 32767.0).astype(np.int16)
    return pcm16.tobytes(), len(y)


async def main():
    pcm_bytes, n_samples = load_pcm16(AUDIO_FILE)
    print(f"loaded {n_samples} samples ({n_samples/SAMPLE_RATE:.2f}s), "
          f"{len(pcm_bytes)} PCM16 bytes")
    print(f"connecting to {WS_URL}")

    async with websockets.connect(WS_URL, max_size=None) as ws:
        print("connected\n")

        async def send_all():
            bytes_per_chunk = CHUNK_SAMPLES * 2
            for i in range(0, len(pcm_bytes), bytes_per_chunk):
                await ws.send(pcm_bytes[i:i + bytes_per_chunk])
                await asyncio.sleep(0.02)
            print(f"[client] sent {len(pcm_bytes)} bytes, waiting...\n")

        send_task = asyncio.create_task(send_all())

        results = 0
        try:
            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=RECV_TIMEOUT)
                try:
                    data = json.loads(raw)
                except (TypeError, json.JSONDecodeError):
                    print(f"[non-json] {raw!r}")
                    continue
                results += 1
                print(f"window={data.get('window_id')}  "
                      f"AI={data.get('ai_probability')}  "
                      f"risk={data.get('risk_level')}  "
                      f"alert={data.get('alert_triggered')}  "
                      f"model={data.get('model_version')}")
        except asyncio.TimeoutError:
            print(f"\n[client] no response for {RECV_TIMEOUT}s — "
                  f"done. Got {results} windows.")

        await send_task

    print(f"\n=== /ws/audio test complete: {results} windows received ===")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(1)
