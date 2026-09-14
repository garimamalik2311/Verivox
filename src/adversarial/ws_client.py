"""Reusable WebSocket client for sending audio to /ws/audio and collecting RiskResults.

Adapted from the working scripts/test_audio_ws.py pattern.
"""

import asyncio
import json
import numpy as np
import websockets


async def send_audio_and_collect(
    audio: np.ndarray,
    stream_id: str,
    host: str = "127.0.0.1",
    port: int = 8000,
    chunk_samples: int = 1600,
    send_delay_s: float = 0.02,
    recv_timeout_s: float = 15.0,
) -> list[dict]:
    """
    Stream float32 mono 16kHz audio (values in [-1, 1]) to /ws/audio and
    return every RiskResult dict received back for this stream.
    """
    audio = np.clip(audio, -1.0, 1.0)
    pcm_bytes = (audio * 32767.0).astype(np.int16).tobytes()

    uri = f"ws://{host}:{port}/ws/audio?stream_id={stream_id}"
    results = []

    async with websockets.connect(uri, max_size=None) as ws:

        async def send_all():
            bytes_per_chunk = chunk_samples * 2
            for i in range(0, len(pcm_bytes), bytes_per_chunk):
                await ws.send(pcm_bytes[i:i + bytes_per_chunk])
                await asyncio.sleep(send_delay_s)

        send_task = asyncio.create_task(send_all())

        try:
            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=recv_timeout_s)
                try:
                    data = json.loads(raw)
                    results.append(data)
                except (TypeError, json.JSONDecodeError):
                    continue
        except asyncio.TimeoutError:
            pass

        await send_task

    return results