"""
mic_capture.py
Captures live audio from the microphone using sounddevice's streaming
callback pattern: instead of recording a fixed clip and returning it,
we open a continuous stream and a callback function fires automatically
every time a new chunk of audio is ready.

This is the "live call" input path — as opposed to file_loader.py,
which handles pre-recorded files.
"""

import queue
import numpy as np
import sounddevice as sd

from config import SAMPLE_RATE, CHANNELS


class MicrophoneStreamer:
    """
    Wraps sounddevice's InputStream to expose a simple generator interface:
    each call to `chunks()` yields the next raw audio chunk as it arrives.
    """

    def __init__(self, blocksize: int = 1600):
        """
        Args:
            blocksize: number of samples per callback invocation.
                       1600 samples @ 16kHz = 100ms per chunk — small enough
                       for responsive downstream processing (VAD, windowing).
        """
        self.blocksize = blocksize
        self._q = queue.Queue()
        self._stream = None

    def _callback(self, indata, frames, time_info, status):
        """Called automatically by sounddevice on a separate audio thread
        whenever a new block of samples is captured."""
        if status:
            print(f"[mic_capture] stream status: {status}")
        # indata is shape (frames, CHANNELS) - flatten to 1D mono
        self._q.put(indata.copy().flatten())

    def start(self):
        self._stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            blocksize=self.blocksize,
            dtype="float32",
            callback=self._callback,
        )
        self._stream.start()

    def stop(self):
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()

    def chunks(self):
        """Generator: yields each captured audio chunk as a 1D np.ndarray."""
        while True:
            yield self._q.get()


if __name__ == "__main__":
    # Manual test: streams mic audio and prints chunk stats for 3 seconds.
    # Requires an actual microphone device - will not work in this sandbox.
    import time

    streamer = MicrophoneStreamer()
    streamer.start()
    print("Recording for 3 seconds... speak into the mic")

    start_time = time.time()
    for chunk in streamer.chunks():
        print(f"chunk: {chunk.shape}, rms={np.sqrt(np.mean(chunk**2)):.4f}")
        if time.time() - start_time > 3:
            break

    streamer.stop()
