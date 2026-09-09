"""
vad.py
Voice Activity Detection using Google's WebRTC VAD.

WebRTC VAD only accepts 16-bit PCM audio in frames of exactly 10, 20, or
30ms at 8/16/32/48kHz. Our pipeline uses 20ms @ 16kHz (VAD_FRAME_SAMPLES = 320
samples per frame, from config.py).

The VAD's job: for each 20ms frame, output True (speech) or False (silence/
non-speech/noise) so we only pass real speech into the windowing stage.
"""

import numpy as np
import webrtcvad

from config import SAMPLE_RATE, VAD_FRAME_MS, VAD_FRAME_SAMPLES, VAD_AGGRESSIVENESS


class VoiceActivityDetector:
    def __init__(self, aggressiveness: int = VAD_AGGRESSIVENESS):
        """
        Args:
            aggressiveness: 0 (least aggressive, keeps more audio as "speech")
                             to 3 (most aggressive, filters more aggressively).
        """
        self.vad = webrtcvad.Vad(aggressiveness)

    def _float_to_pcm16(self, frame: np.ndarray) -> bytes:
        """webrtcvad requires 16-bit PCM bytes, not float32 arrays."""
        pcm16 = (frame * 32768.0).clip(-32768, 32767).astype(np.int16)
        return pcm16.tobytes()

    def is_speech(self, frame: np.ndarray) -> bool:
        """
        Check whether a single 20ms frame contains speech.

        Args:
            frame: 1D float32 array of exactly VAD_FRAME_SAMPLES samples

        Returns:
            True if the frame is classified as speech
        """
        if len(frame) != VAD_FRAME_SAMPLES:
            raise ValueError(
                f"Expected exactly {VAD_FRAME_SAMPLES} samples "
                f"({VAD_FRAME_MS}ms @ {SAMPLE_RATE}Hz), got {len(frame)}"
            )
        pcm_bytes = self._float_to_pcm16(frame)
        return self.vad.is_speech(pcm_bytes, SAMPLE_RATE)

    def filter_speech(self, audio: np.ndarray) -> np.ndarray:
        """
        Run VAD across an entire audio array, frame by frame, and return
        only the concatenated frames classified as speech (silence removed).

        Args:
            audio: 1D float32 array, any length

        Returns:
            1D float32 array containing only speech frames, concatenated
        """
        speech_frames = []
        n_frames = len(audio) // VAD_FRAME_SAMPLES

        for i in range(n_frames):
            start = i * VAD_FRAME_SAMPLES
            end = start + VAD_FRAME_SAMPLES
            frame = audio[start:end]
            if self.is_speech(frame):
                speech_frames.append(frame)
            # trailing partial frame (< 20ms) at the end is dropped

        if not speech_frames:
            return np.array([], dtype=np.float32)

        return np.concatenate(speech_frames)

    def filter_speech_with_origins(self, audio: np.ndarray, start_sample: int = 0):
        """
        Same as filter_speech(), but also tracks WHERE each kept sample
        originally came from in the input audio. This is what lets
        downstream code (window_accumulator, pipeline) recover a real
        timestamp for each window later, instead of losing timing
        information when speech frames get concatenated across silence
        gaps.

        Args:
            audio: 1D float32 array, any length
            start_sample: absolute sample index this `audio` array begins
                at (0 for a single file; running total for a live stream
                made of many chunks)

        Returns:
            (speech_audio, origin_samples) — two 1D arrays of equal length.
            speech_audio[i] is a kept sample; origin_samples[i] is the
            absolute sample index (relative to the very start of the
            recording/stream) that speech_audio[i] came from. Dividing
            origin_samples[i] by SAMPLE_RATE gives a timestamp in seconds
            from the start of the recording.
        """
        speech_frames = []
        origin_frames = []
        n_frames = len(audio) // VAD_FRAME_SAMPLES

        for i in range(n_frames):
            frame_start = i * VAD_FRAME_SAMPLES
            frame_end = frame_start + VAD_FRAME_SAMPLES
            frame = audio[frame_start:frame_end]
            if self.is_speech(frame):
                speech_frames.append(frame)
                # every sample in this frame originated at consecutive
                # absolute positions starting at start_sample + frame_start
                origin_start = start_sample + frame_start
                origin_frames.append(
                    np.arange(origin_start, origin_start + VAD_FRAME_SAMPLES, dtype=np.int64)
                )

        if not speech_frames:
            return np.array([], dtype=np.float32), np.array([], dtype=np.int64)

        return np.concatenate(speech_frames), np.concatenate(origin_frames)


if __name__ == "__main__":
    # Manual test with synthetic audio: silence should be filtered out
    duration_sec = 1.0
    n_samples = int(SAMPLE_RATE * duration_sec)

    silence = np.zeros(n_samples, dtype=np.float32)
    tone = (0.3 * np.sin(2 * np.pi * 200 * np.arange(n_samples) / SAMPLE_RATE)).astype(np.float32)

    vad = VoiceActivityDetector()
    print("Silence -> speech samples kept:", len(vad.filter_speech(silence)))
    print("Tone (not real speech, but non-silent) -> speech samples kept:", len(vad.filter_speech(tone)))