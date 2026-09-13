"""
pipeline.py
Ties together file_loader / mic_capture -> vad -> window_accumulator
into the complete Sprint 1A flow. This is what Docker's CMD runs, and
what Sprint 1B / Sprint 3 will import to get windows to work with.
"""

import numpy as np

from src.file_loader import load_audio_file
from src.vad import VoiceActivityDetector
from src.window_accumulator import WindowAccumulator
from src.config import VAD_FRAME_SAMPLES


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


def process_file_with_timestamps(filepath: str):
    """
    Same as process_file(), but each returned window is paired with a
    timestamp (seconds from the start of the file) marking where that
    window's audio actually occurred in the original recording — even
    though VAD may have removed silence in between.

    This is what Sprint 3 needs to report "HIGH RISK at 14:32:08" instead
    of only "HIGH RISK after speech sample #X" — see the integration
    question raised about VAD losing wall-clock timing.

    Args:
        filepath: path to a WAV/MP3/M4A/OGG/FLAC file

    Returns:
        List of (window, timestamp_sec) tuples.
    """
    audio = load_audio_file(filepath)

    vad = VoiceActivityDetector()
    speech_only, origins = vad.filter_speech_with_origins(audio, start_sample=0)

    accumulator = WindowAccumulator()
    windows_with_timestamps = accumulator.push_with_timestamps(speech_only, origins)

    return windows_with_timestamps


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


def process_mic_stream_with_timestamps(duration_sec: float = 10.0):
    """
    Timestamp-aware version of process_mic_stream(). Tracks a running
    absolute sample counter across the whole live stream, so every
    emitted window still carries an accurate "seconds since stream
    started" timestamp, even across gaps where VAD dropped silence.

    Requires an actual microphone - not runnable in a sandbox.
    """
    import time
    from mic_capture import MicrophoneStreamer

    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()

    streamer = MicrophoneStreamer(blocksize=VAD_FRAME_SAMPLES)
    streamer.start()

    start = time.time()
    absolute_sample_position = 0  # running count of samples seen so far in this stream

    for chunk in streamer.chunks():
        if vad.is_speech(chunk):
            origins = np.arange(
                absolute_sample_position,
                absolute_sample_position + len(chunk),
                dtype=np.int64,
            )
            windows_with_timestamps = accumulator.push_with_timestamps(chunk, origins)
            for w, ts in windows_with_timestamps:
                yield w, ts

        absolute_sample_position += len(chunk)

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