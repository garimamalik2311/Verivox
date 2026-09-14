"""
window_accumulator.py
Buffers a continuous stream of speech audio and slices it into overlapping
1-second windows (50% overlap = 0.5s stride), ready to be handed off for
feature extraction (Sprint 1B) downstream.

This is the last stage of your pipeline: raw audio in -> VAD-filtered
speech in -> clean overlapping windows out.
"""

import numpy as np

from src.config import WINDOW_SIZE_SAMPLES, WINDOW_STRIDE_SAMPLES, SAMPLE_RATE


class WindowAccumulator:
    """
    Maintains an internal buffer of speech samples. Every time enough new
    audio has been pushed in, it emits one or more fixed-size, overlapping
    windows and advances the buffer by the stride (not the full window size),
    which is what creates the 50% overlap between consecutive windows.
    """

    def __init__(self, window_size: int = WINDOW_SIZE_SAMPLES,
                 stride: int = WINDOW_STRIDE_SAMPLES):
        self.window_size = window_size
        self.stride = stride
        self._buffer = np.array([], dtype=np.float32)
        self._origin_buffer = np.array([], dtype=np.int64)

    def push(self, audio_chunk: np.ndarray) -> list[np.ndarray]:
        """
        Add new speech audio to the buffer and return any complete windows
        that can now be emitted.

        Args:
            audio_chunk: 1D float32 array of new (VAD-filtered) speech samples

        Returns:
            List of 1D float32 arrays, each exactly `window_size` samples long.
            Empty list if not enough audio has accumulated yet.
        """
        self._buffer = np.concatenate([self._buffer, audio_chunk])
        windows = []

        while len(self._buffer) >= self.window_size:
            window = self._buffer[: self.window_size]
            windows.append(window.copy())
            # advance by stride, not window_size -> creates the overlap
            self._buffer = self._buffer[self.stride:]

        return windows

    def push_with_timestamps(self, audio_chunk: np.ndarray, origin_samples_chunk: np.ndarray):
        """
        Same as push(), but also carries each sample's ORIGINAL position
        (from vad.filter_speech_with_origins) through the buffer, so every
        emitted window can report where in the real recording/call it
        actually came from — even if VAD dropped silence in between.

        Args:
            audio_chunk: 1D float32 array of new VAD-filtered speech samples
                origin_samples_chunk: 1D int64 array, same length as audio_chunk,
                giving each sample's absolute original sample index

        Returns:
            List of (window, window_timestamp_sec) tuples. window_timestamp_sec
            is the timestamp, in seconds from the start of the recording/call,
            of the FIRST sample in that window — this is the number you hand
            to Sprint 3 alongside window_id so they can say "HIGH RISK at
            14:32:08" instead of only "HIGH RISK after speech sample #X".
        """
        self._buffer = np.concatenate([self._buffer, audio_chunk])
        self._origin_buffer = np.concatenate([self._origin_buffer, origin_samples_chunk])
        windows = []

        while len(self._buffer) >= self.window_size:
            window = self._buffer[: self.window_size].copy()
            window_start_origin_sample = self._origin_buffer[0]
            window_timestamp_sec = float(window_start_origin_sample) / SAMPLE_RATE
            windows.append((window, window_timestamp_sec))
            self._buffer = self._buffer[self.stride:]
            self._origin_buffer = self._origin_buffer[self.stride:]

        return windows

    def reset(self):
        """Clear the buffer, e.g. after a period of silence/call end."""
        self._buffer = np.array([], dtype=np.float32)
        self._origin_buffer = np.array([], dtype=np.int64)


if __name__ == "__main__":
    # Manual test: push 2.5 seconds of audio in small chunks, verify overlap math
    acc = WindowAccumulator()
    total_samples = int(SAMPLE_RATE * 2.5)
    fake_speech = np.random.randn(total_samples).astype(np.float32) * 0.1

    all_windows = []
    chunk_size = 1600  # simulate 100ms chunks arriving from mic/VAD
    for i in range(0, len(fake_speech), chunk_size):
        chunk = fake_speech[i:i + chunk_size]
        new_windows = acc.push(chunk)
        all_windows.extend(new_windows)

    print(f"Pushed {total_samples} samples ({total_samples/SAMPLE_RATE:.1f}s)")
    print(f"Emitted {len(all_windows)} windows of {acc.window_size} samples each")