import asyncio

from src.risk_engine.dispatch.base import DispatchMessage
from src.risk_engine.dispatch.service import DispatchService


def make_message() -> DispatchMessage:
    return DispatchMessage(
        title="High-Risk Voice Impersonation Detected",
        message="Synthetic voice risk detected.",
        scenario="high_value_transaction",
        severity="HIGH",
        recommended_actions=(
            "Halt the wire transfer",
            "Require secondary verification",
        ),
        privacy_mode="feature_only",
    )


def test_dispatch_disabled_does_not_send(monkeypatch):
    monkeypatch.setenv(
        "VERIVOX_DISPATCH_ENABLED",
        "false",
    )

    service = DispatchService()

    results = asyncio.run(
        service.dispatch(
            make_message(),
            ["dashboard", "sms", "webhook"],
        )
    )

    assert len(results) == 3

    dashboard = next(
        result for result in results
        if result.channel == "dashboard"
    )
    sms = next(
        result for result in results
        if result.channel == "sms"
    )
    webhook = next(
        result for result in results
        if result.channel == "webhook"
    )

    assert dashboard.attempted is True
    assert dashboard.delivered is True

    assert sms.attempted is False
    assert sms.delivered is False

    assert webhook.attempted is False
    assert webhook.delivered is False


def test_dashboard_dispatch_is_available_by_default(
    monkeypatch,
):
    monkeypatch.setenv(
        "VERIVOX_DISPATCH_ENABLED",
        "false",
    )

    service = DispatchService()

    results = asyncio.run(
        service.dispatch(
            make_message(),
            ["dashboard"],
        )
    )

    assert len(results) == 1
    assert results[0].channel == "dashboard"
    assert results[0].attempted is True
    assert results[0].delivered is True
