from src.risk_engine.thresholds import (
    FLAG_THRESHOLD,
    HIGH_ENTER_THRESHOLD,
    HIGH_EXIT_THRESHOLD,
    MEDIUM_THRESHOLD,
    REQUIRED_CONSECUTIVE_FLAGS,
    ROLLING_WINDOW_SIZE,
)


def test_thresholds_are_valid():
    assert 0.0 <= MEDIUM_THRESHOLD <= 1.0
    assert 0.0 <= HIGH_EXIT_THRESHOLD <= 1.0
    assert 0.0 <= HIGH_ENTER_THRESHOLD <= 1.0
    assert 0.0 <= FLAG_THRESHOLD <= 1.0


def test_high_threshold_has_hysteresis():
    assert HIGH_EXIT_THRESHOLD < HIGH_ENTER_THRESHOLD


def test_persistence_configuration():
    assert REQUIRED_CONSECUTIVE_FLAGS > 0
    assert ROLLING_WINDOW_SIZE > 0