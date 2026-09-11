import pytest

from src.risk_engine.buffer import RollingBuffer


def test_buffer_stores_values():
    buffer = RollingBuffer(max_size=3)

    buffer.add(0.1)
    buffer.add(0.2)

    assert buffer.values() == [0.1, 0.2]


def test_buffer_keeps_only_latest_values():
    buffer = RollingBuffer(max_size=3)

    buffer.add(0.1)
    buffer.add(0.2)
    buffer.add(0.3)
    buffer.add(0.4)

    assert buffer.values() == [0.2, 0.3, 0.4]


def test_buffer_clear():
    buffer = RollingBuffer(max_size=3)

    buffer.add(0.5)
    buffer.add(0.6)

    buffer.clear()

    assert buffer.values() == []
    assert len(buffer) == 0


def test_invalid_buffer_size():
    with pytest.raises(ValueError):
        RollingBuffer(max_size=0)


def test_invalid_probability():
    buffer = RollingBuffer()

    with pytest.raises(ValueError):
        buffer.add(1.5)

    with pytest.raises(ValueError):
        buffer.add(-0.1)