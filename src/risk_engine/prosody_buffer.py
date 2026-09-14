"""
prosody_buffer.py
Person A — Feature 1 (Prosody).

Tracks rolling pitch variance and behavioral timing across a 5-window
buffer per stream. Separate from risk_engine/buffer.py's RollingBuffer,
which tracks AI-probability scores for the alert state machine — this
buffer tracks a different signal (pitch/timing) for a different purpose
(prosody-based diagnostic cues, e.g. "flat_prosody_timing").

Pitch mean/std live at feature vector indices [56, 57] per
reports/feature_bucket_map.json + src/features.py (confirmed against
Person B's real extractor).
"""

from collections import deque

import numpy as np

PITCH_MEAN_INDEX = 56
PITCH_STD_INDEX = 57
PROSODY_BUFFER_WINDOWS = 5

# Below this rolling pitch variance, prosody is considered suspiciously
# "flat" (a known synthetic-speech artifact). Placeholder — needs tuning
# against real labeled data before being trusted in production.
FLAT_PROSODY_VARIANCE_THRESHOLD = 5.0


class ProsodyBuffer:
    """
    Rolling buffer of (pitch_mean, timestamp) pairs for one stream.
    Call push() once per window; read is_flat_prosody() / pitch_variance()
    once at least 2 windows have been pushed (variance is undefined for 1).
    """

    def __init__(self, max_windows: int = PROSODY_BUFFER_WINDOWS):
        if max_windows < 2:
            raise ValueError("max_windows must be >= 2 to compute variance")
        self._pitch_means = deque(maxlen=max_windows)
        self._timestamps = deque(maxlen=max_windows)

    def push(self, feature_vector: np.ndarray, timestamp: float) -> None:
        """
        Add one window's features + timestamp to the rolling buffer.

        Args:
            feature_vector: the 58-D feature array for this window
            timestamp: seconds since stream start (or wall-clock time)
        """
        if feature_vector.shape[0] <= PITCH_STD_INDEX:
            raise ValueError(
                f"feature_vector must have at least {PITCH_STD_INDEX + 1} "
                f"dims to read pitch stats, got {feature_vector.shape[0]}"
            )
        self._pitch_means.append(float(feature_vector[PITCH_MEAN_INDEX]))
        self._timestamps.append(float(timestamp))

    def pitch_variance(self) -> float | None:
        """Rolling variance of pitch mean across the buffered windows."""
        if len(self._pitch_means) < 2:
            return None
        return float(np.var(np.array(self._pitch_means)))

    def timing_variance(self) -> float | None:
        """
        Rolling variance of inter-window timing deltas — unnaturally
        regular timing (very low variance) can itself be a synthetic-
        speech / bot-call signal.
        """
        if len(self._timestamps) < 3:
            return None
        deltas = np.diff(np.array(self._timestamps))
        return float(np.var(deltas))

    def is_flat_prosody(self) -> bool | None:
        """
        Returns True if rolling pitch variance is below the flat-prosody
        threshold, False if above, None if not enough data yet.
        """
        variance = self.pitch_variance()
        if variance is None:
            return None
        return variance < FLAT_PROSODY_VARIANCE_THRESHOLD

    def reset(self) -> None:
        self._pitch_means.clear()
        self._timestamps.clear()
