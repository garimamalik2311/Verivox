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
        model      = base
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
            or os.getenv("VERIVOX_STT_MODEL", "base")
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
                beam_size=3,
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
