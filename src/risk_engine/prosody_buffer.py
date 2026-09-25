# ProsodyBuffer is a utility class that maintains a buffer of
# pitch statistics and timestamps.
# It provides methods to compute mean pitch, standard deviation,
# variance percentage, and timing variance over the buffered data.
# It also includes a method to determine if the prosody is flat
# based on a predefined variance threshold.
# The buffer can be reset to clear all stored data.

from collections import deque

import numpy as np


PITCH_MEAN_INDEX = 56
PITCH_STD_INDEX = 57
PROSODY_BUFFER_WINDOWS = 5

FLAT_PROSODY_VARIANCE_THRESHOLD = 5.0


class ProsodyBuffer:
    def __init__(self, max_windows: int = PROSODY_BUFFER_WINDOWS):
        if max_windows < 2:
            raise ValueError("max_windows must be >= 2 to compute variance")

        self._pitch_means = deque(maxlen=max_windows)
        self._pitch_stds = deque(maxlen=max_windows)
        self._timestamps = deque(maxlen=max_windows)

    def push(self, feature_vector: np.ndarray, timestamp: float) -> None:
        if feature_vector.shape[0] <= PITCH_STD_INDEX:
            raise ValueError(
                f"feature_vector must have at least {PITCH_STD_INDEX + 1} "
                f"dims to read pitch stats, got {feature_vector.shape[0]}"
            )

        self._pitch_means.append(
            float(feature_vector[PITCH_MEAN_INDEX])
        )

        self._pitch_stds.append(
            float(feature_vector[PITCH_STD_INDEX])
        )

        self._timestamps.append(float(timestamp))

    def pitch_mean(self) -> float | None:
        if not self._pitch_means:
            return None

        return float(np.mean(np.array(self._pitch_means)))

    def pitch_std(self) -> float | None:
        if not self._pitch_stds:
            return None

        return float(np.mean(np.array(self._pitch_stds)))

    def pitch_variance_percent(self) -> float | None:
        """
        Measures temporal pitch variation between consecutive windows.

        For each pair of consecutive windows:

            change = abs(F0_current - F0_previous) / F0_previous * 100

        The returned value is the mean percentage change across the
        available consecutive windows.
        """
        if len(self._pitch_means) < 2:
            return None

        pitch_means = np.array(self._pitch_means, dtype=float)

        previous = pitch_means[:-1]
        current = pitch_means[1:]

        valid = (
            np.isfinite(previous)
            & np.isfinite(current)
            & (previous > 0)
        )

        if not np.any(valid):
            return None

        percentage_changes = (
            np.abs(current[valid] - previous[valid])
            / previous[valid]
            * 100.0
        )

        return float(np.mean(percentage_changes))

    def timing_variance(self) -> float | None:
        if len(self._timestamps) < 3:
            return None

        deltas = np.diff(np.array(self._timestamps))

        return float(np.var(deltas))

    def is_flat_prosody(self) -> bool | None:
        variance_percent = self.pitch_variance_percent()

        if variance_percent is None:
            return None

        return variance_percent < FLAT_PROSODY_VARIANCE_THRESHOLD

    def reset(self) -> None:
        self._pitch_means.clear()
        self._pitch_stds.clear()
        self._timestamps.clear()


class FullStreamProsodyAccumulator:
    """
    Accumulates prosody statistics across the entire audio stream.

    Unlike ProsodyBuffer, this state is not limited to the latest
    PROSODY_BUFFER_WINDOWS windows.
    """

    def __init__(self):
        self._pitch_mean_sum = 0.0
        self._pitch_mean_count = 0

        self._pitch_std_sum = 0.0
        self._pitch_std_count = 0

        self._previous_pitch_mean = None
        self._pitch_change_sum = 0.0
        self._pitch_change_count = 0

        self._previous_timestamp = None
        self._timing_count = 0
        self._timing_mean = 0.0
        self._timing_m2 = 0.0

        self._spoof_probability_sum = 0.0
        self._spoof_probability_count = 0

    def push(
        self,
        feature_vector: np.ndarray,
        timestamp: float,
        spoof_probability: float | None = None,
    ) -> None:
        pitch_mean = float(feature_vector[PITCH_MEAN_INDEX])
        pitch_std = float(feature_vector[PITCH_STD_INDEX])
        timestamp = float(timestamp)

        if np.isfinite(pitch_mean):
            self._pitch_mean_sum += pitch_mean
            self._pitch_mean_count += 1

            if (
                self._previous_pitch_mean is not None
                and np.isfinite(self._previous_pitch_mean)
                and self._previous_pitch_mean > 0
                and pitch_mean > 0
            ):
                change = (
                    abs(pitch_mean - self._previous_pitch_mean)
                    / self._previous_pitch_mean
                    * 100.0
                )
                self._pitch_change_sum += change
                self._pitch_change_count += 1

            self._previous_pitch_mean = pitch_mean

        if np.isfinite(pitch_std):
            self._pitch_std_sum += pitch_std
            self._pitch_std_count += 1

        if (
            self._previous_timestamp is not None
            and np.isfinite(timestamp)
        ):
            delta = timestamp - self._previous_timestamp

            if np.isfinite(delta) and delta >= 0:
                self._timing_count += 1

                delta_mean_delta = (
                    delta - self._timing_mean
                )
                self._timing_mean += (
                    delta_mean_delta / self._timing_count
                )
                delta_m2 = (
                    delta - self._timing_mean
                )
                self._timing_m2 += (
                    delta_mean_delta * delta_m2
                )

        self._previous_timestamp = timestamp

        if (
            spoof_probability is not None
            and np.isfinite(spoof_probability)
        ):
            self._spoof_probability_sum += float(
                spoof_probability
            )
            self._spoof_probability_count += 1

    def pitch_mean(self) -> float | None:
        if self._pitch_mean_count == 0:
            return None
        return (
            self._pitch_mean_sum
            / self._pitch_mean_count
        )

    def pitch_std(self) -> float | None:
        if self._pitch_std_count == 0:
            return None
        return (
            self._pitch_std_sum
            / self._pitch_std_count
        )

    def pitch_variance_percent(self) -> float | None:
        if self._pitch_change_count == 0:
            return None
        return (
            self._pitch_change_sum
            / self._pitch_change_count
        )

    def timing_variance(self) -> float | None:
        if self._timing_count < 2:
            return None
        return self._timing_m2 / self._timing_count

    def spoof_probability(self) -> float | None:
        if self._spoof_probability_count == 0:
            return None
        return (
            self._spoof_probability_sum
            / self._spoof_probability_count
        )

    def is_flat_prosody(self) -> bool | None:
        variance_percent = self.pitch_variance_percent()
        if variance_percent is None:
            return None
        return variance_percent < FLAT_PROSODY_VARIANCE_THRESHOLD

    def reset(self) -> None:
        self.__init__()
