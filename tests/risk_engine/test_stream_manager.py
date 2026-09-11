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
        timestamp=float(window_id),
        ai_probability=probability,
        model_version="xgb_v1",
    )


def test_streams_have_independent_state():
    manager = StreamManager()

    for window_id, probability in enumerate(
        [0.82, 0.86, 0.91, 0.88],
        start=1,
    ):
        result = manager.update(
            make_prediction("call_001", window_id, probability)
        )

    assert result.risk_level == RiskLevel.HIGH
    assert result.alert_triggered is True

    result = manager.update(
        make_prediction("call_002", 1, 0.90)
    )

    assert result.risk_level == RiskLevel.MEDIUM
    assert result.consecutive_flags == 1
    assert result.alert_triggered is False


def test_each_stream_maintains_its_own_window_order():
    manager = StreamManager()

    result_a = manager.update(
        make_prediction("call_001", 1, 0.20)
    )

    result_b = manager.update(
        make_prediction("call_002", 1, 0.90)
    )

    assert result_a.window_id == 1
    assert result_b.window_id == 1


def test_active_streams():
    manager = StreamManager()

    manager.update(make_prediction("call_001", 1, 0.20))
    manager.update(make_prediction("call_002", 1, 0.20))

    assert set(manager.active_streams()) == {
        "call_001",
        "call_002",
    }


def test_reset_stream_clears_only_that_stream():
    manager = StreamManager()

    for window_id, probability in enumerate(
        [0.82, 0.86, 0.91, 0.88],
        start=1,
    ):
        manager.update(
            make_prediction("call_001", window_id, probability)
        )

    manager.reset_stream("call_001")

    result = manager.update(
        make_prediction("call_001", 5, 0.90)
    )

    assert result.risk_level == RiskLevel.MEDIUM
    assert result.consecutive_flags == 1
    assert result.alert_triggered is False


def test_remove_stream():
    manager = StreamManager()

    manager.update(
        make_prediction("call_001", 1, 0.20)
    )

    assert "call_001" in manager.active_streams()

    manager.remove_stream("call_001")

    assert "call_001" not in manager.active_streams()

    result = manager.update(
        make_prediction("call_001", 1, 0.90)
    )

    assert result.risk_level == RiskLevel.MEDIUM
    assert result.consecutive_flags == 1


def test_reset_unknown_stream_is_safe():
    manager = StreamManager()

    manager.reset_stream("does_not_exist")

    assert manager.active_streams() == []


def test_remove_unknown_stream_is_safe():
    manager = StreamManager()

    manager.remove_stream("does_not_exist")

    assert manager.active_streams() == []
def test_interleaved_streams_remain_independent():
    manager = StreamManager()

    sequence = [
        ("call_001", 1, 0.82),
        ("call_002", 1, 0.20),
        ("call_001", 2, 0.86),
        ("call_002", 2, 0.25),
        ("call_001", 3, 0.91),
        ("call_002", 3, 0.15),
        ("call_001", 4, 0.88),
        ("call_002", 4, 0.18),
    ]

    results = {}

    for stream_id, window_id, probability in sequence:
        results[(stream_id, window_id)] = manager.update(
            make_prediction(stream_id, window_id, probability)
        )

    # call_001 receives four persistent high predictions.
    high_result = results[("call_001", 4)]

    assert high_result.risk_level == RiskLevel.HIGH
    assert high_result.consecutive_flags == 4
    assert high_result.alert_triggered is True

    # call_002 remains low throughout and is unaffected by call_001.
    low_result = results[("call_002", 4)]

    assert low_result.risk_level == RiskLevel.LOW
    assert low_result.consecutive_flags == 0
    assert low_result.alert_triggered is False
    assert low_result.rolling_score < 0.50
