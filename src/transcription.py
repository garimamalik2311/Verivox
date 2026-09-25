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
        *,
        condition_on_previous_text: bool = True,
        vad_filter: bool = True,
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
                vad_filter=vad_filter,
                condition_on_previous_text=condition_on_previous_text,
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
class TranscriptSnapshot:
    """Current transcript view for a live audio stream."""

    segments: tuple[TranscriptSegment, ...]
    text: str
    language: str | None
    audio_start: float
    audio_end: float
    is_final: bool


class StreamingTranscriber:
    """
    Rolling-context transcript engine for live and uploaded audio.

    STT is intentionally independent from VeriVox's detector windows.
    The detector keeps its existing 1-second / 0.5-second analysis cadence.

    For live audio:
        - retain the continuous stream in transient memory
        - periodically transcribe the latest context window
        - return the latest transcript snapshot

    For completed uploads:
        - run one final transcription over the complete transient buffer
        - return the highest-context transcript
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        update_seconds: float = 4.0,
        context_seconds: float = 12.0,
    ) -> None:
        self.sample_rate = sample_rate

        self.update_samples = int(
            sample_rate * update_seconds
        )

        self.context_samples = int(
            sample_rate * context_seconds
        )

        if self.update_samples <= 0:
            raise ValueError(
                "STT update interval must be positive"
            )

        if self.context_samples < self.update_samples:
            raise ValueError(
                "STT context must be >= update interval"
            )

        self.reset()

    def reset(self) -> None:
        """Reset the transient audio/transcript state."""

        self._audio = np.empty(
            0,
            dtype=np.float32,
        )

        self._start_sample = 0
        self._expected_next_sample = 0
        self._last_update_length = 0

    def _append(
        self,
        audio: np.ndarray,
        start_sample: int,
    ) -> None:
        """Append one contiguous source-audio packet."""

        audio = np.asarray(
            audio,
            dtype=np.float32,
        ).reshape(-1)

        if len(audio) == 0:
            return

        if start_sample != self._expected_next_sample:
            print(
                "[stt] Audio timeline discontinuity: "
                f"expected={self._expected_next_sample} "
                f"received={start_sample}. "
                "Resetting STT buffer."
            )

            self.reset()
            self._start_sample = start_sample

        if len(self._audio) == 0:
            self._start_sample = start_sample

        self._audio = np.concatenate(
            (
                self._audio,
                audio,
            )
        )

        self._expected_next_sample = (
            start_sample + len(audio)
        )

    def transcribe_snapshot(
        self,
        audio: np.ndarray,
        start_sample: int,
        is_final: bool = False,
    ) -> TranscriptSnapshot:
        """Run Whisper on an immutable audio snapshot."""

        segments = transcriber.transcribe(
            audio,
            sample_rate=self.sample_rate,
            timestamp_offset=(
                start_sample / self.sample_rate
            ),
            condition_on_previous_text=True,
            vad_filter=True,
        )

        text = " ".join(
            segment.text.strip()
            for segment in segments
            if segment.text.strip()
        ).strip()

        language = None

        for segment in segments:
            if segment.language:
                language = segment.language
                break

        audio_start = (
            start_sample / self.sample_rate
        )

        audio_end = (
            start_sample + len(audio)
        ) / self.sample_rate

        return TranscriptSnapshot(
            segments=tuple(segments),
            text=text,
            language=language,
            audio_start=audio_start,
            audio_end=audio_end,
            is_final=is_final,
        )

    def feed(
        self,
        audio: np.ndarray,
        start_sample: int,
    ) -> tuple[np.ndarray, int] | None:
        """
        Append continuous source audio.

        Returns an immutable context snapshot for Whisper when enough new
        audio has arrived. Whisper itself is NOT called here.
        """

        self._append(
            audio,
            start_sample,
        )

        if (
            len(self._audio)
            - self._last_update_length
            < self.update_samples
        ):
            return None

        context_start_offset = max(
            0,
            len(self._audio) - self.context_samples,
        )

        context = self._audio[
            context_start_offset:
        ].copy()

        context_start_sample = (
            self._start_sample
            + context_start_offset
        )

        self._last_update_length = len(
            self._audio
        )

        return (
            context,
            context_start_sample,
        )

    def final_input(
        self,
    ) -> tuple[np.ndarray, int] | None:
        """Return the complete transient stream for final transcription."""

        if len(self._audio) == 0:
            return None

        return (
            self._audio.copy(),
            self._start_sample,
        )


__all__ = [
    "TranscriptSegment",
    "TranscriptSnapshot",
    "WhisperTranscriber",
    "StreamingTranscriber",
    "transcriber",
]
