from pydantic import TypeAdapter

from src.risk_engine.schemas import ModelPrediction, RiskLevel, RiskResult
from src.risk_engine.stream_manager import StreamManager


def test_model_prediction_accepts_expected_json_contract():
    payload = {
        "schema_version": "1.0",
        "stream_id": "call_001",
        "window_id": 42,
        "timestamp": 1725890000.5,
        "ai_probability": 0.87,
        "model_version": "xgb_v1",
    }

    prediction = ModelPrediction.model_validate(payload)

    assert prediction.stream_id == "call_001"
    assert prediction.window_id == 42
    assert prediction.timestamp == 1725890000.5
    assert prediction.ai_probability == 0.87
    assert prediction.model_version == "xgb_v1"


def test_risk_result_serializes_to_expected_json():
    result = RiskResult(
        stream_id="call_001",
        window_id=42,
        timestamp=1725890000.5,
        ai_probability=0.87,
        rolling_score=0.81,
        consecutive_flags=4,
        risk_level=RiskLevel.HIGH,
        alert_triggered=True,
        alert_reason="persistent_high_ai_probability",
        model_version="xgb_v1",
    )

    payload = result.model_dump()

    assert payload["schema_version"] == "1.0"
    assert payload["stream_id"] == "call_001"
    assert payload["window_id"] == 42
    assert payload["timestamp"] == 1725890000.5
    assert payload["ai_probability"] == 0.87
    assert payload["rolling_score"] == 0.81
    assert payload["consecutive_flags"] == 4
    assert payload["risk_level"] == RiskLevel.HIGH
    assert payload["alert_triggered"] is True
    assert payload["alert_reason"] == "persistent_high_ai_probability"
    assert payload["model_version"] == "xgb_v1"


def test_risk_result_json_uses_string_risk_level():
    result = RiskResult(
        stream_id="call_001",
        window_id=42,
        timestamp=1725890000.5,
        ai_probability=0.87,
        rolling_score=0.81,
        consecutive_flags=4,
        risk_level=RiskLevel.HIGH,
        alert_triggered=True,
        alert_reason="persistent_high_ai_probability",
        model_version="xgb_v1",
    )

    json_payload = result.model_dump_json()

    assert '"risk_level":"HIGH"' in json_payload
    assert '"alert_triggered":true' in json_payload


def test_stream_manager_produces_serializable_risk_result():
    manager = StreamManager()

    result = None

    for window_id, probability in enumerate(
        [0.82, 0.86, 0.91, 0.88],
        start=1,
    ):
        prediction = ModelPrediction(
            stream_id="call_001",
            window_id=window_id,
            timestamp=1000.0 + window_id * 0.5,
            ai_probability=probability,
            model_version="xgb_v1",
        )

        result = manager.update(prediction)

    assert result is not None
    assert result.risk_level == RiskLevel.HIGH
    assert result.alert_triggered is True

    json_payload = result.model_dump_json()

    assert '"stream_id":"call_001"' in json_payload
    assert '"window_id":4' in json_payload
    assert '"risk_level":"HIGH"' in json_payload
    assert '"alert_triggered":true' in json_payload
    assert '"alert_reason":"persistent_high_ai_probability"' in json_payload


def test_non_alert_result_has_no_alert_reason():
    manager = StreamManager()

    prediction = ModelPrediction(
        stream_id="call_001",
        window_id=1,
        timestamp=1000.5,
        ai_probability=0.20,
        model_version="xgb_v1",
    )

    result = manager.update(prediction)

    assert result.alert_triggered is False
    assert result.alert_reason is None
