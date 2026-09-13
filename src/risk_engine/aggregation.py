from statistics import mean


def rolling_mean(values: list[float]) -> float:
    """Return the mean of the supplied AI probability values."""
    if not values:
        return 0.0

    return mean(values)