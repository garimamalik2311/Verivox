import asyncio
import json
import websockets

async def main():
    uri = "ws://127.0.0.1:8000/ws"

    async with websockets.connect(uri) as websocket:
        # Sequence specified in Part 19:
        # call_001 -> 0.1
        # call_002 -> 0.9
        # call_001 -> 0.2
        # call_002 -> 0.95
        steps = [
            ("call_001", 1, 0.1),
            ("call_002", 1, 0.9),
            ("call_001", 2, 0.2),
            ("call_002", 2, 0.95),
        ]

        for stream_id, window_id, prob in steps:
            prediction = {
                "schema_version": "1.0",
                "stream_id": stream_id,
                "window_id": window_id,
                "timestamp": 1725890000.5,
                "ai_probability": prob,
                "model_version": "xgb_test"
            }

            await websocket.send(json.dumps(prediction))
            response = await websocket.recv()
            
            res_data = json.loads(response)
            print(f"Stream: {res_data['stream_id']} | Window: {res_data['window_id']} | Prob: {prob} | Rolling Score: {res_data['rolling_score']} | Risk: {res_data['risk_level']}")

asyncio.run(main())