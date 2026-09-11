import asyncio
import json
import websockets

async def main():
    uri = "ws://127.0.0.1:8000/ws"

    async with websockets.connect(uri) as websocket:
        probabilities = [0.10, 0.15, 0.12, 0.20, 0.85, 0.90, 0.92, 0.95, 0.93, 0.20]

        for i, probability in enumerate(probabilities, start=1):
            prediction = {
                "schema_version": "1.0",
                "stream_id": "call_001",
                "window_id": i,
                "timestamp": 1725890000.5 + (i * 0.5),
                "ai_probability": probability,
                "model_version": "xgb_test"
            }

            await websocket.send(json.dumps(prediction))
            response = await websocket.recv()
            print(f"Window {i} (prob {probability}):", response)

asyncio.run(main())