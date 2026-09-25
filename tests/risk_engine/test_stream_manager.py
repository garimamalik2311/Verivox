from src.risk_engine.schemas import ModelPrediction, RiskLevel
from src.risk_engine.stream_manager import StreamManager


def make_prediction(
    stream_id: str,
    window_id: int,
    probability: float,
) -> ModelPrediction:
    return ModelPrediction(
        stream_id=stream_id,
        window_id=window_id,
        timestamp=1000.0 + window_id * 0.5,
        ai_probability=probability,
        model_version="xgb_v1",
    )


def test_high_value_stream_uses_two_window_policy():
    manager = StreamManager()

    manager.configure_stream(
        "high_value_001",
        "high_value_transaction",
    )

    first = manager.update(
        make_prediction("high_value_001", 1, 0.82)
    )
    second = manager.update(
        make_prediction("high_value_001", 2, 0.86)
    )

    assert first.alert_triggered is False
    assert second.alert_triggered is True
    assert second.risk_level == RiskLevel.HIGH


def test_default_stream_keeps_three_window_behavior():
    manager = StreamManager()

    first = manager.update(
        make_prediction("routine_001", 1, 0.82)
    )
    second = manager.update(
        make_prediction("routine_001", 2, 0.86)
    )
    third = manager.update(
        make_prediction("routine_001", 3, 0.88)
    )

    assert first.alert_triggered is False
    assert second.alert_triggered is False
    assert third.alert_triggered is True


def test_same_stream_cannot_change_scenario():
    manager = StreamManager()

    manager.configure_stream(
        "shared_001",
        "high_value_transaction",
    )

    try:
        manager.configure_stream(
            "shared_001",
            "routine_support",
        )
    except ValueError:
        return

    raise AssertionError(
        "Changing scenario for an active stream must be rejected"
    )
