import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from src.risk_engine.schemas import ModelPrediction
from src.risk_engine.stream_manager import StreamManager

app = FastAPI()
stream_manager = StreamManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            # Receive raw text first to handle bad JSON syntax safely
            raw_text = await websocket.receive_text()
            
            try:
                data = json.loads(raw_text) if isinstance(raw_text, str) else raw_text
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Malformed JSON payload"})
                continue

            try:
                prediction = ModelPrediction(**data)
            except ValidationError as e:
                await websocket.send_json({
                    "error": "Invalid prediction payload",
                    "details": e.errors()
                })
                continue

            # Process valid prediction through teammate's risk engine
            result = stream_manager.update(prediction)
            await websocket.send_json(result.model_dump())

    except WebSocketDisconnect:
        print("Client disconnected")