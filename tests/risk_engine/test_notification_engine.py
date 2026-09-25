from src.risk_engine.notification_engine import (
    NotificationEngine,
    Scenario,
)


def test_high_value_transaction_triggers():
    result = NotificationEngine().evaluate(
        scenario=Scenario.HIGH_VALUE_TRANSACTION.value,
        risk_score=0.90,
        alert_triggered=True,
    )

    assert result.triggered is True
    assert result.severity == "HIGH"
    assert result.threshold == 0.80
    assert "Halt the wire transfer" in result.recommended_actions
    assert "dashboard" in result.dispatch_channels
    assert "sms" in result.dispatch_channels
    assert "webhook" in result.dispatch_channels


def test_privileged_access_triggers_at_threshold():
    result = NotificationEngine().evaluate(
        scenario=Scenario.PRIVILEGED_ACCESS.value,
        risk_score=0.70,
        alert_triggered=True,
    )

    assert result.triggered is True
    assert result.threshold == 0.70


def test_routine_support_triggers():
    result = NotificationEngine().evaluate(
        scenario=Scenario.ROUTINE_SUPPORT.value,
        risk_score=0.80,
        alert_triggered=True,
    )

    assert result.triggered is True
    assert result.dispatch_channels == ["dashboard"]


def test_alert_flag_is_required():
    result = NotificationEngine().evaluate(
        scenario=Scenario.HIGH_VALUE_TRANSACTION.value,
        risk_score=0.95,
        alert_triggered=False,
    )

    assert result.triggered is False
    assert result.severity == "NONE"
    assert result.recommended_actions == []
    assert result.dispatch_channels == []


def test_below_threshold_does_not_trigger():
    result = NotificationEngine().evaluate(
        scenario=Scenario.HIGH_VALUE_TRANSACTION.value,
        risk_score=0.79,
        alert_triggered=True,
    )

    assert result.triggered is False
    assert result.severity == "NONE"


def test_unknown_scenario_falls_back_to_routine_support():
    result = NotificationEngine().evaluate(
        scenario="unknown_scenario",
        risk_score=0.90,
        alert_triggered=True,
    )

    assert result.scenario == Scenario.ROUTINE_SUPPORT.value
    assert result.triggered is True
