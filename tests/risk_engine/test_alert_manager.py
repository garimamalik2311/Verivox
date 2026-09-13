from src.risk_engine.alert_manager import AlertManager
from src.risk_engine.schemas import RiskLevel


def test_alert_on_first_high():
    manager = AlertManager()

    triggered, reason = manager.update(RiskLevel.HIGH)

    assert triggered is True
    assert reason == "persistent_high_ai_probability"


def test_no_repeated_alert_while_high():
    manager = AlertManager()

    manager.update(RiskLevel.HIGH)

    triggered, reason = manager.update(RiskLevel.HIGH)

    assert triggered is False
    assert reason is None


def test_alert_can_trigger_again_after_recovery():
    manager = AlertManager()

    manager.update(RiskLevel.HIGH)
    manager.update(RiskLevel.MEDIUM)

    triggered, reason = manager.update(RiskLevel.HIGH)

    assert triggered is True
    assert reason == "persistent_high_ai_probability"


def test_low_does_not_trigger_alert():
    manager = AlertManager()

    triggered, reason = manager.update(RiskLevel.LOW)

    assert triggered is False
    assert reason is None


def test_reset():
    manager = AlertManager()

    manager.update(RiskLevel.HIGH)
    manager.reset()

    triggered, reason = manager.update(RiskLevel.HIGH)

    assert triggered is True
    assert reason == "persistent_high_ai_probability"