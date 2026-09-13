"""
Sprint 2b - Step 9: Edge case tests for the /predict API.

Tests the model/API against inputs it should never see in normal
operation, but might hit in a live demo (silence, corrupted audio,
malformed requests). Documents what actually happens in each case.
"""

from fastapi.testclient import TestClient
from src.api.predict import app
import json

client = TestClient(app)

VALID_REQUEST = {
    "stream_id": "test_edge",
    "window_id": 1,
    "timestamp": 123.0,
}


def test_all_zero_features():
    """All-zero features: what does the model output? Should NOT crash."""
    response = client.post("/predict", json={**VALID_REQUEST, "features": [0.0] * 58})
    assert response.status_code == 200
    prob = response.json()["ai_probability"]
    print(f"\n[all-zero features] status=200, ai_probability={prob:.4f}")
    # Document: this is out-of-distribution input, so the probability
    # is not meaningful, but the API must not crash on it.


def test_very_large_features():
    """Very large, out-of-training-distribution values. Should NOT crash."""
    response = client.post("/predict", json={**VALID_REQUEST, "features": [1e6] * 58})
    assert response.status_code == 200
    prob = response.json()["ai_probability"]
    print(f"[very large features] status=200, ai_probability={prob:.4f}")


def test_all_nan_features():
    """All-NaN features: must be REJECTED with 400, not crash or silently pass."""
    # Python's json module supports NaN as a non-standard extension, and
    # httpx/starlette will serialize it correctly for this internal test client.

    raw_body = json.dumps({**VALID_REQUEST, "features": [float("nan")] * 58})
    response = client.post(
        "/predict",
        content=raw_body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    print(f"[all-NaN features] status=400, detail={response.json()['detail']}")


def test_wrong_feature_count():
    """Wrong number of features: must be REJECTED with 400."""
    response = client.post("/predict", json={**VALID_REQUEST, "features": [0.1, 0.2, 0.3] * 19})  # 57 features
    assert response.status_code == 400
    print(f"[wrong feature count] status=400, detail={response.json()['detail']}")


if __name__ == "__main__":
    test_all_zero_features()
    test_very_large_features()
    test_all_nan_features()
    test_wrong_feature_count()
    print("\nAll edge case tests passed.")