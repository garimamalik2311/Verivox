"""
pipeline.py
Ties together file_loader / mic_capture -> vad -> window_accumulator
into the complete Sprint 1A flow. This is what Docker's CMD runs, and
what Sprint 1B / Sprint 3 will import to get windows to work with.
"""

import numpy as np

from file_loader import load_audio_file
from vad import VoiceActivityDetector
from window_accumulator import WindowAccumulator
from config import VAD_FRAME_SAMPLES


def process_file(filepath: str) -> list[np.ndarray]:
    """
    Full Sprint 1A pipeline for a pre-recorded file:
    load -> standardize to 16kHz mono -> VAD filter -> windowed output.

    Args:
        filepath: path to a WAV/MP3/M4A/OGG/FLAC file

    Returns:
        List of 1-second overlapping speech windows (np.ndarray each)
    """
    audio = load_audio_file(filepath)

    vad = VoiceActivityDetector()
    speech_only = vad.filter_speech(audio)

    accumulator = WindowAccumulator()
    windows = accumulator.push(speech_only)

    return windows


def process_mic_stream(duration_sec: float = 10.0):
    """
    Full Sprint 1A pipeline for live microphone input.
    Runs for `duration_sec` seconds, yielding windows as they're ready.

    Requires an actual microphone - not runnable in a sandbox.
    """
    import time
    from mic_capture import MicrophoneStreamer

    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()

    streamer = MicrophoneStreamer(blocksize=VAD_FRAME_SAMPLES)
    streamer.start()

    start = time.time()
    for chunk in streamer.chunks():
        if vad.is_speech(chunk):
            windows = accumulator.push(chunk)
            for w in windows:
                yield w
        if time.time() - start > duration_sec:
            break

    streamer.stop()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        windows = process_file(sys.argv[1])
        print(f"Produced {len(windows)} windows from {sys.argv[1]}")
    else:
        print("Usage: python3 pipeline.py <audio_file>")
        print("(or import process_mic_stream() for live mic input)")
