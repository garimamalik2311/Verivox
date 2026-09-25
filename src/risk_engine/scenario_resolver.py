from dataclasses import dataclass

from src.risk_engine.notification_engine import (
    POLICIES,
    Scenario,
)

HIGH_VALUE_TRANSACTION_THRESHOLD_INR = 500_000.0


@dataclass(frozen=True)
class ScenarioResolution:
    scenario: Scenario
    source: str
    transaction_amount_inr: float | None


def resolve_scenario(
    requested_scenario: str | None = None,
    transaction_amount_inr: float | None = None,
) -> ScenarioResolution:
    """
    Resolve the response policy for a session.

    Priority:
    1. A transaction amount strictly greater than ₹5,00,000
       automatically selects high_value_transaction.
    2. Otherwise, an explicitly requested valid scenario is used.
    3. Otherwise, routine_support is used.
    """

    if transaction_amount_inr is not None:
        amount = float(transaction_amount_inr)

        if amount < 0:
            raise ValueError(
                "transaction_amount_inr cannot be negative"
            )

        if amount > HIGH_VALUE_TRANSACTION_THRESHOLD_INR:
            return ScenarioResolution(
                scenario=Scenario.HIGH_VALUE_TRANSACTION,
                source="transaction_amount",
                transaction_amount_inr=amount,
            )

    try:
        selected = Scenario(
            requested_scenario or Scenario.ROUTINE_SUPPORT.value
        )
        source = (
            "explicit"
            if requested_scenario
            else "default"
        )
    except ValueError:
        selected = Scenario.ROUTINE_SUPPORT
        source = "invalid_request"

    return ScenarioResolution(
        scenario=selected,
        source=source,
        transaction_amount_inr=(
            float(transaction_amount_inr)
            if transaction_amount_inr is not None
            else None
        ),
    )
