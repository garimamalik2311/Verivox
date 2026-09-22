"""
SIH Notification & Response Engine

Owned module: Chetana

Converts backend risk telemetry into scenario-specific:
- notification severity
- pre-transaction recommendations
- dispatch channels
- automated response actions

No raw audio is stored or forwarded by this module.
"""

from dataclasses import dataclass
from enum import Enum


class Scenario(str, Enum):
    HIGH_VALUE_TRANSACTION = "high_value_transaction"
    PRIVILEGED_ACCESS = "privileged_access"
    ROUTINE_SUPPORT = "routine_support"


@dataclass(frozen=True)
class NotificationPolicy:
    scenario: Scenario
    threshold: float
    required_consecutive_flags: int
    title: str
    message: str
    recommended_actions: tuple[str, ...]
    dispatch_channels: tuple[str, ...]


POLICIES: dict[Scenario, NotificationPolicy] = {
    Scenario.HIGH_VALUE_TRANSACTION: NotificationPolicy(
        scenario=Scenario.HIGH_VALUE_TRANSACTION,
        threshold=0.80,
        required_consecutive_flags=2,
        title="High-Risk Voice Impersonation Detected",
        message=(
            "Synthetic or cloned voice risk has crossed the "
            "high-value transaction protection threshold."
        ),
        recommended_actions=(
            "Halt the wire transfer",
            "Enforce out-of-band caller verification",
            "Trigger step-up multi-factor authentication",
            "Escalate to fraud investigation supervisor",
        ),
        dispatch_channels=(
            "dashboard",
            "sms",
            "webhook",
        ),
    ),
    Scenario.PRIVILEGED_ACCESS: NotificationPolicy(
        scenario=Scenario.PRIVILEGED_ACCESS,
        threshold=0.70,
        required_consecutive_flags=3,
        title="Privileged Voice Authentication Warning",
        message=(
            "Voice impersonation risk is above the configured "
            "privileged-access protection threshold."
        ),
        recommended_actions=(
            "Pause privileged approval",
            "Trigger step-up biometric authentication",
            "Require secondary verification",
        ),
        dispatch_channels=(
            "dashboard",
            "sms",
            "webhook",
        ),
    ),
    Scenario.ROUTINE_SUPPORT: NotificationPolicy(
        scenario=Scenario.ROUTINE_SUPPORT,
        threshold=0.80,
        required_consecutive_flags=3,
        title="Synthetic Voice Risk Detected",
        message=(
            "Voice authenticity risk has crossed the routine "
            "customer-support threshold."
        ),
        recommended_actions=(
            "Warn the frontline agent",
            "Request secondary caller verification",
        ),
        dispatch_channels=(
            "dashboard",
        ),
    ),
}


@dataclass
class NotificationDecision:
    scenario: str
    triggered: bool
    severity: str
    threshold: float
    required_consecutive_flags: int
    title: str | None
    message: str | None
    recommended_actions: list[str]
    dispatch_channels: list[str]
    privacy_mode: str = "feature_only"


class NotificationEngine:
    def evaluate(
        self,
        scenario: str,
        risk_score: float,
        alert_triggered: bool,
    ) -> NotificationDecision:

        try:
            selected = Scenario(scenario)
        except ValueError:
            selected = Scenario.ROUTINE_SUPPORT

        policy = POLICIES[selected]

        triggered = (
            alert_triggered
            and risk_score >= policy.threshold
        )

        if triggered:
            severity = "HIGH"
            return NotificationDecision(
                scenario=policy.scenario.value,
                triggered=True,
                severity=severity,
                threshold=policy.threshold,
                required_consecutive_flags=policy.required_consecutive_flags,
                title=policy.title,
                message=policy.message,
                recommended_actions=list(
                    policy.recommended_actions
                ),
                dispatch_channels=list(
                    policy.dispatch_channels
                ),
            )

        return NotificationDecision(
            scenario=policy.scenario.value,
            triggered=False,
            severity="NONE",
            threshold=policy.threshold,
            required_consecutive_flags=policy.required_consecutive_flags,
            title=None,
            message=None,
            recommended_actions=[],
            dispatch_channels=[],
        )
