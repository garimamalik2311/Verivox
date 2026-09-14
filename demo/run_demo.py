import asyncio
import json
import websockets
import librosa
import numpy as np

SERVER = "ws://localhost:8000/ws/audio"

async def run_file(path, label):
    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print(f"  {path}")
    print(f"{'=' * 60}")

    audio, _ = librosa.load(path, sr=16000, mono=True)
    pcm = (audio * 32767).astype(np.int16).tobytes()

    results = []

    async with websockets.connect(
        SERVER,
        ping_interval=None,
    ) as ws:

        async def receive():
            try:
                async for msg in ws:
                    results.append(json.loads(msg))
            except websockets.exceptions.ConnectionClosed:
                pass

        receiver = asyncio.create_task(receive())

        for i in range(0, len(pcm), 640):
            await ws.send(pcm[i:i + 640])
            await asyncio.sleep(0.02)

        await asyncio.sleep(3)
        receiver.cancel()

    if not results:
        print("❌ No RiskResult messages received")
        return

    max_ai = max(r["ai_probability"] for r in results)
    max_rolling = max(r["rolling_score"] for r in results)
    alerts = [r for r in results if r["alert_triggered"]]
    high = [r for r in results if r["risk_level"] == "HIGH"]

    print(f"Windows processed : {len(results)}")
    print(f"Max AI probability : {max_ai:.3f}")
    print(f"Max rolling score  : {max_rolling:.3f}")
    print(f"HIGH windows       : {len(high)}")
    print(f"Alerts triggered   : {len(alerts)}")

    if alerts:
        r = alerts[0]
        print("\n🚨 ALERT DETECTED")
        print(f"   Window : {r['window_id']}")
        print(f"   AI     : {r['ai_probability']:.3f}")
        print(f"   Rolling: {r['rolling_score']:.3f}")
        print(f"   Risk   : {r['risk_level']}")
    else:
        print("\n✅ No HIGH-RISK alert")


async def main():
    await run_file(
        "demo/real_voice.wav",
        "REAL VOICE",
    )

    await run_file(
        "demo/cloned_voice.wav",
        "CLONED VOICE",
    )


asyncio.run(main())
