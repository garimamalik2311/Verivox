import pytest
from pydantic import ValidationError

from src.risk_engine.schemas import ModelPrediction, RiskLevel, RiskResult


def test_valid_model_prediction():
    prediction = ModelPrediction(
        stream_id="call_001",
        window_id=1,
        timestamp=1725890000.5,
        ai_probability=0.87,
        model_version="xgb_v1",
    )

    assert prediction.stream_id == "call_001"
    assert prediction.ai_probability == 0.87
    assert prediction.window_id == 1


def test_probability_must_be_between_zero_and_one():
    with pytest.raises(ValidationError):
        ModelPrediction(
            stream_id="call_001",
            window_id=1,
            timestamp=1725890000.5,
            ai_probability=1.5,
            model_version="xgb_v1",
        )


def test_risk_result():
    result = RiskResult(
        stream_id="call_001",
        window_id=4,
        timestamp=1725890002.0,
        ai_probability=0.87,
        rolling_score=0.81,
        consecutive_flags=4,
        risk_level=RiskLevel.HIGH,
        alert_triggered=True,
        alert_reason="persistent_high_ai_probability",
        model_version="xgb_v1",
    )

    assert result.risk_level == RiskLevel.HIGH
    assert result.alert_triggered is True