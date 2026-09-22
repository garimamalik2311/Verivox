import pytest

from src.risk_engine.engine import RiskEngine
from src.risk_engine.schemas import ModelPrediction, RiskLevel


def make_prediction(window_id: int, probability: float) -> ModelPrediction:
    return ModelPrediction(
        stream_id="call_001",
        window_id=window_id,
        timestamp=1000.0 + window_id * 0.5,
        ai_probability=probability,
        model_version="xgb_v1",
    )


def test_normal_predictions_stay_low():
    engine = RiskEngine()

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(
            [0.12, 0.15, 0.18, 0.13, 0.16],
            start=1,
        )
    ]

    assert results[-1].risk_level == RiskLevel.LOW
    assert results[-1].alert_triggered is False


def test_persistent_high_predictions_trigger_alert():
    engine = RiskEngine()

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(
            [0.82, 0.86, 0.91, 0.88, 0.90],
            start=1,
        )
    ]

    # The alert should trigger when the 3rd consecutive
    # suspicious prediction arrives.
    assert results[2].risk_level == RiskLevel.HIGH
    assert results[2].alert_triggered is True

    # The 5th prediction remains HIGH but must not
    # generate another alert.
    assert results[4].risk_level == RiskLevel.HIGH
    assert results[4].alert_triggered is False


def test_high_state_does_not_spam_alerts():
    engine = RiskEngine()

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(
            [0.82, 0.86, 0.91, 0.88, 0.90, 0.92],
            start=1,
        )
    ]

    alerts = [result for result in results if result.alert_triggered]

    assert len(alerts) == 1


def test_single_spike_does_not_trigger_alert():
    engine = RiskEngine()

    probabilities = [0.12, 0.15, 0.91, 0.14, 0.16, 0.13]

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(probabilities, start=1)
    ]

    assert all(result.alert_triggered is False for result in results)


def test_recovery_allows_new_alert():
    engine = RiskEngine()

    probabilities = [
        0.82,
        0.86,
        0.91,
        0.88,
        0.90,
        0.20,
        0.20,
        0.20,
        0.85,
        0.88,
        0.91,
        0.90,
    ]

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(probabilities, start=1)
    ]

    alerts = [result for result in results if result.alert_triggered]

    assert len(alerts) == 2


def test_duplicate_window_is_rejected():
    engine = RiskEngine()

    engine.update(make_prediction(1, 0.5))

    with pytest.raises(ValueError):
        engine.update(make_prediction(1, 0.6))

def test_timestamp_gap_does_not_insert_zero_probability():
    engine = RiskEngine()

    first = ModelPrediction(
        stream_id="call_001",
        window_id=1,
        timestamp=1000.5,
        ai_probability=0.85,
        model_version="xgb_v1",
    )

    second = ModelPrediction(
        stream_id="call_001",
        window_id=2,
        timestamp=1001.0,
        ai_probability=0.86,
        model_version="xgb_v1",
    )

    third = ModelPrediction(
        stream_id="call_001",
        window_id=3,
        timestamp=1005.0,
        ai_probability=0.87,
        model_version="xgb_v1",
    )

    engine.update(first)
    engine.update(second)
    result = engine.update(third)

    # The timestamp gap must not create a fake zero-probability
    # prediction in the rolling buffer.
    assert len(engine.buffer) == 3
    assert result.rolling_score == pytest.approx(
        (0.85 + 0.86 + 0.87) / 3
    )


def test_timestamp_is_preserved_in_risk_result():
    engine = RiskEngine()

    prediction = ModelPrediction(
        stream_id="call_001",
        window_id=1,
        timestamp=1725890000.5,
        ai_probability=0.87,
        model_version="xgb_v1",
    )

    result = engine.update(prediction)

    assert result.timestamp == prediction.timestamp


def test_reset():
    engine = RiskEngine()

    engine.update(make_prediction(1, 0.8))
    engine.reset()

    assert len(engine.buffer) == 0


def test_single_high_prediction_does_not_trigger_high():
    engine = RiskEngine()

    result = engine.update(make_prediction(1, 0.90))

    assert result.risk_level != RiskLevel.HIGH
    assert result.alert_triggered is False


def test_two_window_policy_triggers_after_two_flags():
    engine = RiskEngine(
        flag_threshold=0.80,
        required_consecutive_flags=2,
    )

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(
            [0.82, 0.86],
            start=1,
        )
    ]

    assert results[0].alert_triggered is False
    assert results[1].alert_triggered is True
    assert results[1].risk_level == RiskLevel.HIGH


def test_lower_policy_threshold_controls_flagging():
    engine = RiskEngine(
        flag_threshold=0.70,
        required_consecutive_flags=2,
    )

    results = [
        engine.update(make_prediction(i, probability))
        for i, probability in enumerate(
            [0.72, 0.74],
            start=1,
        )
    ]

    assert results[0].alert_triggered is False
    assert results[1].alert_triggered is True
