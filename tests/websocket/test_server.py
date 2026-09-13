from fastapi.testclient import TestClient
from src.websocket.server import app
from src.risk_engine.schemas import ModelPrediction

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

def test_stream_ownership_lifecycle():
    from src.websocket.server import (
        acquire_stream,
        release_stream,
        stream_manager,
        stream_owners,
    )

    stream_id = "lifecycle_test_stream"

    # Start clean.
    stream_manager.remove_stream(stream_id)
    stream_owners.pop(stream_id, None)

    # First connection acquires the stream.
    acquire_stream(stream_id)

    assert stream_owners[stream_id] == 1

    # Create Risk Engine state.
    prediction = ModelPrediction(
        stream_id=stream_id,
        window_id=1,
        timestamp=1.0,
        ai_probability=0.9,
        model_version="test-model",
    )

    stream_manager.update(prediction)

    assert stream_id in stream_manager.active_streams()

    # Second connection joins the same stream.
    acquire_stream(stream_id)

    assert stream_owners[stream_id] == 2

    # First connection disconnects.
    release_stream(stream_id)

    assert stream_owners[stream_id] == 1
    assert stream_id in stream_manager.active_streams()

    # Last connection disconnects.
    release_stream(stream_id)

    assert stream_id not in stream_owners
    assert stream_id not in stream_manager.active_streams()