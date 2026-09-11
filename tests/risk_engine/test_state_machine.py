from src.risk_engine.schemas import RiskLevel
from src.risk_engine.state_machine import RiskStateMachine


def test_starts_low():
    machine = RiskStateMachine()

    assert machine.state == RiskLevel.LOW


def test_low_to_medium():
    machine = RiskStateMachine()

    assert machine.update(0.55) == RiskLevel.MEDIUM


def test_medium_to_high():
    machine = RiskStateMachine()

    machine.update(0.55)

    assert machine.update(0.75) == RiskLevel.HIGH


def test_low_to_high_directly():
    machine = RiskStateMachine()

    assert machine.update(0.75) == RiskLevel.HIGH


def test_high_hysteresis():
    machine = RiskStateMachine()

    machine.update(0.75)

    # 0.65 is below HIGH enter threshold,
    # but above HIGH exit threshold.
    assert machine.update(0.65) == RiskLevel.HIGH


def test_high_to_medium():
    machine = RiskStateMachine()

    machine.update(0.75)

    assert machine.update(0.58) == RiskLevel.MEDIUM


def test_medium_to_low():
    machine = RiskStateMachine()

    machine.update(0.55)

    assert machine.update(0.40) == RiskLevel.LOW


def test_high_to_low():
    machine = RiskStateMachine()

    machine.update(0.75)

    assert machine.update(0.40) == RiskLevel.LOW


def test_reset():
    machine = RiskStateMachine()

    machine.update(0.75)
    machine.reset()

    assert machine.state == RiskLevel.LOW
    