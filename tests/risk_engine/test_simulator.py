from src.risk_engine.schemas import RiskLevel
from src.risk_engine.stream_manager import StreamManager
from src.risk_engine.schemas import ModelPrediction


def make_prediction(window_id: int, probability: float) -> ModelPrediction:
    return ModelPrediction(
        stream_id="test_call",
        window_id=window_id,
        timestamp=float(window_id),
        ai_probability=probability,
        model_version="xgb_v1",
    )


def run_sequence(probabilities: list[float]):
    manager = StreamManager()
    results = []

    for window_id, probability in enumerate(probabilities, start=1):
        results.append(
            manager.update(
                make_prediction(window_id, probability)
            )
        )

    return results


def test_normal_sequence_stays_low():
    results = run_sequence(
        [0.12, 0.18, 0.21, 0.15, 0.20]
    )

    assert all(
        result.risk_level == RiskLevel.LOW
        for result in results
    )

    assert not any(
        result.alert_triggered
        for result in results
    )


def test_single_spike_does_not_trigger_alert():
    results = run_sequence(
        [0.12, 0.91, 0.18, 0.20, 0.16]
    )

    assert results[1].risk_level == RiskLevel.MEDIUM

    assert not any(
        result.alert_triggered
        for result in results
    )

    assert results[-1].risk_level == RiskLevel.LOW


def test_persistent_high_triggers_exactly_one_alert():
    results = run_sequence(
        [0.82, 0.86, 0.91, 0.88, 0.90]
    )

    assert results[2].risk_level == RiskLevel.HIGH
    assert results[2].alert_triggered is True

    assert results[4].risk_level == RiskLevel.HIGH
    assert results[4].alert_triggered is False

    assert sum(
        result.alert_triggered
        for result in results
    ) == 1


def test_recovery_returns_to_low():
    results = run_sequence(
        [0.82, 0.86, 0.91, 0.88, 0.40, 0.20, 0.15, 0.10, 0.08]
    )

    assert results[2].risk_level == RiskLevel.HIGH
    assert results[2].alert_triggered is True

    assert results[6].risk_level == RiskLevel.MEDIUM

    assert results[7].risk_level == RiskLevel.LOW
    assert results[8].risk_level == RiskLevel.LOW


def test_alert_retriggers_after_recovery():
    results = run_sequence(
        [
            0.82, 0.86, 0.91, 0.88,
            0.20, 0.15, 0.12,
            0.82, 0.86, 0.91, 0.88,
        ]
    )

    alert_indices = [
        index
        for index, result in enumerate(results)
        if result.alert_triggered
    ]

    assert alert_indices == [2, 10]
