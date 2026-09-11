from collections import deque


class RollingBuffer:
    """Stores the most recent AI probability scores."""

    def __init__(self, max_size: int = 5):
        if max_size <= 0:
            raise ValueError("max_size must be greater than 0")

        self._buffer = deque(maxlen=max_size)

    def add(self, value: float) -> None:
        if not 0.0 <= value <= 1.0:
            raise ValueError("AI probability must be between 0 and 1")

        self._buffer.append(value)

    def values(self) -> list[float]:
        return list(self._buffer)

    def clear(self) -> None:
        self._buffer.clear()

    def __len__(self) -> int:
        return len(self._buffer)