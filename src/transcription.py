"""
VeriVox speech-to-text transcription.

Baat Likho
----------
Converts already-decoded 16 kHz mono audio windows into timestamped
transcript segments.

This module is deliberately separate from the Risk Engine so that
transcription cannot alter detection decisions.
"""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass

import numpy as np
from src.vad import VoiceActivityDetector


@dataclass(frozen=True)
class TranscriptSegment:
    """One timestamped transcription segment."""

    start: float
    end: float
    text: str
    language: str | None = None


class WhisperTranscriber:
    """
    Lazy-loaded Whisper transcriber.

    Default:
        model      = small
        device     = cuda
        compute    = float16

    CPU fallback:
        int8
    """

    def __init__(
        self,
        model_name: str | None = None,
        device: str | None = None,
        compute_type: str | None = None,
    ) -> None:
        self.model_name = (
            model_name
            or os.getenv("VERIVOX_STT_MODEL", "small")
        )

        self.device = (
            device
            or os.getenv("VERIVOX_STT_DEVICE", "cuda")
        )

        self.compute_type = (
            compute_type
            or os.getenv(
                "VERIVOX_STT_COMPUTE_TYPE",
                "float16" if self.device == "cuda" else "int8",
            )
        )

        self._model = None
        self._load_lock = threading.Lock()
        self._transcribe_lock = threading.Lock()

    def _load_model(self):
        """Load Whisper exactly once."""

        if self._model is not None:
            return self._model

        with self._load_lock:
            if self._model is not None:
                return self._model

            from faster_whisper import WhisperModel

            print(
                "[stt] Loading Whisper "
                f"model={self.model_name} "
                f"device={self.device} "
                f"compute={self.compute_type}"
            )

            try:
                self._model = WhisperModel(
                    self.model_name,
                    device=self.device,
                    compute_type=self.compute_type,
                )

            except Exception as exc:
                if self.device != "cuda":
                    raise

                print(
                    "[stt] CUDA Whisper initialization failed: "
                    f"{exc}"
                )
                print("[stt] Falling back to CPU int8.")

                self.device = "cpu"
                self.compute_type = "int8"

                self._model = WhisperModel(
                    self.model_name,
                    device="cpu",
                    compute_type="int8",
                )

            print(
                "[stt] Whisper model ready "
                f"device={self.device} "
                f"compute={self.compute_type}"
            )

            return self._model

    def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        timestamp_offset: float = 0.0,
    ) -> list[TranscriptSegment]:
        """
        Transcribe one already-decoded audio window.

        Args:
            audio:
                float32 mono samples in [-1, 1].

            sample_rate:
                Expected 16000 Hz.

            timestamp_offset:
                Absolute stream time represented by this window.

        Returns:
            Timestamped transcript segments.
        """

        if audio is None or len(audio) == 0:
            return []

        audio = np.asarray(
            audio,
            dtype=np.float32,
        ).reshape(-1)

        if sample_rate != 16000:
            raise ValueError(
                "WhisperTranscriber expects 16 kHz audio, "
                f"got {sample_rate} Hz"
            )

        # Whisper does not need another VAD pass here.
        # VeriVox has already passed the window through backend VAD.
        model = self._load_model()

        with self._transcribe_lock:
            segments, info = model.transcribe(
                audio,
                beam_size=5,
                vad_filter=False,
                condition_on_previous_text=False,
                word_timestamps=False,
            )

            output: list[TranscriptSegment] = []

            for segment in segments:
                text = segment.text.strip()

                if not text:
                    continue

                output.append(
                    TranscriptSegment(
                        start=(
                            timestamp_offset
                            + float(segment.start)
                        ),
                        end=(
                            timestamp_offset
                            + float(segment.end)
                        ),
                        text=text,
                        language=getattr(
                            info,
                            "language",
                            None,
                        ),
                    )
                )

            return output


# One shared transcriber for the backend process.
transcriber = WhisperTranscriber()


@dataclass(frozen=True)
class StreamingTranscript:
    """Snapshot returned by the continuous streaming transcriber."""

    language: str | None
    audio_start: float
    audio_end: float
    text: str
    segments: tuple[TranscriptSegment, ...]
    is_final: bool = False


class StreamingTranscriber:
    """
    Continuous rolling transcription over source audio.

    Audio is accumulated independently from the detector/VAD windows.
    Every update_seconds of new source audio produces an immutable
    snapshot for Whisper. A rolling context is retained so consecutive
    snapshots have linguistic context without changing detection logic.
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        update_seconds: float = 2.0,
        context_seconds: float = 12.0,
        model_name: str | None = None,
        device: str | None = None,
        compute_type: str | None = None,
    ) -> None:
        self.sample_rate = sample_rate
        self.update_samples = max(
            1,
            int(round(update_seconds * sample_rate)),
        )
        self.context_samples = max(
            self.update_samples,
            int(round(context_seconds * sample_rate)),
        )

        self.transcriber = WhisperTranscriber(
            model_name=model_name,
            device=device,
            compute_type=compute_type,
        )
        self.vad = VoiceActivityDetector()

        self._audio = np.empty(0, dtype=np.float32)
        self._audio_start_sample = 0
        self._next_update_sample = self.update_samples

    def feed(
        self,
        audio: np.ndarray,
        start_sample: int,
    ) -> tuple[np.ndarray, int] | None:
        """
        Append original source audio and return a snapshot when enough
        new audio has accumulated.
        """

        if audio is None or len(audio) == 0:
            return None

        audio = np.asarray(
            audio,
            dtype=np.float32,
        ).reshape(-1)

        if len(self._audio) == 0:
            self._audio_start_sample = int(start_sample)

        self._audio = np.concatenate(
            (self._audio, audio)
        )

        if len(self._audio) < self._next_update_sample:
            return None

        snapshot_end = len(self._audio)

        if snapshot_end < self._next_update_sample:
            return None

        snapshot = self._make_snapshot()
        self._next_update_sample += self.update_samples

        # Do not send Whisper snapshots for silence/non-speech.
        # Reuse VeriVox's existing WebRTC VAD.
        snapshot_audio, _ = snapshot
        speech_detected = False

        frame_size = 320  # 20 ms @ 16 kHz

        for frame_start in range(
            0,
            len(snapshot_audio) - frame_size + 1,
            frame_size,
        ):
            frame = snapshot_audio[
                frame_start:frame_start + frame_size
            ]

            if self.vad.is_speech(frame):
                speech_detected = True
                break

        if not speech_detected:
            return None

        return snapshot

    def _make_snapshot(self) -> tuple[np.ndarray, int]:
        """Return the latest rolling-context audio snapshot."""

        end = len(self._audio)
        start = max(
            0,
            end - self.context_samples,
        )

        snapshot_start_sample = (
            self._audio_start_sample + start
        )

        snapshot = self._audio[start:end].copy()

        return snapshot, snapshot_start_sample

    def transcribe_snapshot(
        self,
        audio: np.ndarray,
        start_sample: int,
        is_final: bool = False,
    ) -> StreamingTranscript:
        """Transcribe one immutable rolling snapshot."""

        segments = self.transcriber.transcribe(
            audio,
            sample_rate=self.sample_rate,
            timestamp_offset=(
                float(start_sample) / self.sample_rate
            ),
        )

        language = (
            next(
                (
                    segment.language
                    for segment in segments
                    if segment.language
                ),
                None,
            )
        )

        text = " ".join(
            segment.text
            for segment in segments
        ).strip()

        audio_start = (
            float(start_sample) / self.sample_rate
        )

        audio_end = (
            audio_start
            + len(audio) / self.sample_rate
        )

        return StreamingTranscript(
            language=language,
            audio_start=audio_start,
            audio_end=audio_end,
            text=text,
            segments=tuple(segments),
            is_final=is_final,
        )

    def final_input(
        self,
    ) -> tuple[np.ndarray, int] | None:
        """Return the remaining source audio as a final snapshot."""

        if len(self._audio) == 0:
            return None

        if len(self._audio) < self._next_update_sample:
            return self._make_snapshot()

        return self._make_snapshot()

    def reset(self) -> None:
        """Reset the rolling transcription state."""

        self._audio = np.empty(
            0,
            dtype=np.float32,
        )
        self._audio_start_sample = 0
        self._next_update_sample = self.update_samples
