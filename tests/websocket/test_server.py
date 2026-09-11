from fastapi.testclient import TestClient
from src.websocket.server import app

client = TestClient(app)

def test_websocket_prediction_flow():
    with client.websocket_connect("/ws") as websocket:
        # Send a valid low-risk prediction
        payload = {
            "schema_version": "1.0",
            "stream_id": "test_stream_01",
            "window_id": 1,
            "timestamp": 1725890000.5,
            "ai_probability": 0.15,
            "model_version": "xgb_test"
        }
        websocket.send_json(payload)
        data = websocket.receive_json()

        assert data["stream_id"] == "test_stream_01"
        assert data["risk_level"] == "LOW"
        assert data["rolling_score"] == 0.15

def test_websocket_invalid_payload():
    with client.websocket_connect("/ws") as websocket:
        # Send invalid probability (> 1.0) to trigger Pydantic validation error handling
        bad_payload = {
            "schema_version": "1.0",
            "stream_id": "test_stream_01",
            "window_id": 1,
            "timestamp": 1725890000.5,
            "ai_probability": 2.5, 
            "model_version": "xgb_test"
        }
        websocket.send_json(bad_payload)
        data = websocket.receive_json()

        assert "error" in data
        assert data["error"] == "Invalid prediction payload"