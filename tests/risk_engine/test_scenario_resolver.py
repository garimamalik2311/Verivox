from src.risk_engine.scenario_resolver import resolve_scenario


def test_exactly_5_lakh_is_not_high_value():
    result = resolve_scenario(
        requested_scenario="routine_support",
        transaction_amount_inr=500_000,
    )

    assert result.scenario.value == "routine_support"
    assert result.source == "explicit"


def test_above_5_lakh_auto_resolves_high_value():
    result = resolve_scenario(
        requested_scenario="routine_support",
        transaction_amount_inr=500_001,
    )

    assert result.scenario.value == "high_value_transaction"
    assert result.source == "transaction_amount"


def test_low_value_uses_requested_scenario():
    result = resolve_scenario(
        requested_scenario="privileged_access",
        transaction_amount_inr=100_000,
    )

    assert result.scenario.value == "privileged_access"
    assert result.source == "explicit"


def test_negative_amount_rejected():
    try:
        resolve_scenario(
            requested_scenario="routine_support",
            transaction_amount_inr=-1,
        )
    except ValueError:
        return

    raise AssertionError("Negative transaction amount was accepted")
