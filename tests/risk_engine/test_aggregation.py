import pytest

from src.risk_engine.aggregation import rolling_mean


def test_rolling_mean():
    values = [0.15, 0.81, 0.87, 0.92, 0.88]

    result = rolling_mean(values)

    assert result == pytest.approx(0.726)


def test_rolling_mean_single_value():
    assert rolling_mean([0.8]) == pytest.approx(0.8)


def test_rolling_mean_empty():
    assert rolling_mean([]) == 0.0


def test_rolling_mean_normal_values():
    values = [0.1, 0.2, 0.3, 0.4]

    assert rolling_mean(values) == pytest.approx(0.25)