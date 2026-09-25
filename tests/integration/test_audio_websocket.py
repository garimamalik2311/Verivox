import asyncio
import json

import librosa
import numpy as np
import websockets


AUDIO_FILE = "data/WhatsApp Ptt 2026-09-09 at 4.11.59 PM.ogg"
WEBSOCKET_URL = "ws://127.0.0.1:8000/ws/audio?stream_id=pytest_audio_001"

SAMPLE_RATE = 16000
CHUNK_SAMPLES = SAMPLE_RATE


async def run_test():
    print("\n=== /ws/audio integration test ===")

    audio, sr = librosa.load(
        AUDIO_FILE,
        sr=SAMPLE_RATE,
        mono=True,
    )

    print(f"Audio loaded: {len(audio) / sr:.2f}s")
    print(f"Sample rate: {sr} Hz")

    async with websockets.connect(WEBSOCKET_URL) as websocket:
        print("Connected to /ws/audio")

        windows_received = 0
        results = []

        for start in range(0, len(audio), CHUNK_SAMPLES):
            chunk = audio[start:start + CHUNK_SAMPLES]

            if len(chunk) == 0:
                continue

            pcm16 = np.clip(chunk, -1.0, 1.0)
            pcm16 = (pcm16 * 32767).astype(np.int16)

            await websocket.send(pcm16.tobytes())

            # Give the backend time to process this chunk.
            # A chunk may produce zero or more RiskResults.
            while True:
                try:
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=0.5,
                    )
                except asyncio.TimeoutError:
                    break

                data = json.loads(response)

                if "error" in data:
                    raise AssertionError(
                        f"Backend returned error: {data}"
                    )

                if data.get("type") in {
                    "transcript_snapshot",
                    "transcript_complete",
                }:
                    continue

                assert data["schema_version"] == "1.0"
                assert data["stream_id"] == "pytest_audio_001"

                assert "window_id" in data
                assert "timestamp" in data
                assert "ai_probability" in data
                assert "rolling_score" in data
                assert "consecutive_flags" in data
                assert "risk_level" in data
                assert "alert_triggered" in data
                assert "model_version" in data

                assert 0.0 <= data["ai_probability"] <= 1.0
                assert 0.0 <= data["rolling_score"] <= 1.0

                windows_received += 1
                results.append(data)

                print(
                    f"window={data['window_id']:<3} "
                    f"AI={data['ai_probability']:.3f} "
                    f"rolling={data['rolling_score']:.3f} "
                    f"risk={data['risk_level']}"
                )

        assert windows_received > 0, (
            "No RiskResult received from /ws/audio"
        )

        # Window IDs must increase monotonically.
        window_ids = [result["window_id"] for result in results]

        assert window_ids == sorted(window_ids)
        assert len(window_ids) == len(set(window_ids))

    print(f"\n✅ Received {windows_received} RiskResult messages")
    print("✅ /ws/audio integration test PASSED")


def test_audio_websocket():
    asyncio.run(run_test())


if __name__ == "__main__":
    asyncio.run(run_test())
    
async def run_silence_test():
    print("\n=== /ws/audio silence test ===")

    silence = np.zeros(
        SAMPLE_RATE * 2,
        dtype=np.float32,
    )

    pcm16 = np.zeros(
        SAMPLE_RATE * 2,
        dtype=np.int16,
    )

    async with websockets.connect(
        "ws://127.0.0.1:8000/ws/audio?stream_id=pytest_silence_001"
    ) as websocket:

        print("Connected to /ws/audio")

        await websocket.send(pcm16.tobytes())

        # Silence must not generate a RiskResult.
        try:
            response = await asyncio.wait_for(
                websocket.recv(),
                timeout=1.0,
            )

            data = json.loads(response)

            raise AssertionError(
                f"Silence unexpectedly produced a result: {data}"
            )

        except asyncio.TimeoutError:
            pass

    print("✅ Silence produced no prediction")


def test_silence_audio_websocket():
    asyncio.run(run_silence_test())