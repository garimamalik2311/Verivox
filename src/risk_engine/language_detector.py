from __future__ import annotations

import threading
from pathlib import Path

import numpy as np
import torch
from speechbrain.inference.classifiers import EncoderClassifier


SUPPORTED_LANGUAGES = {"en", "hi", "ta"}

MODEL_SOURCE = "speechbrain/lang-id-commonlanguage_ecapa"
MODEL_DIR = Path("pretrained_models/lang-id-commonlanguage_ecapa")

_classifier: EncoderClassifier | None = None
_classifier_lock = threading.Lock()

_stream_languages: dict[str, str | None] = {}
_stream_lock = threading.Lock()


def _get_classifier() -> EncoderClassifier:
    global _classifier

    if _classifier is None:
        with _classifier_lock:
            if _classifier is None:
                _classifier = EncoderClassifier.from_hparams(
                    source=MODEL_SOURCE,
                    savedir=str(MODEL_DIR),
                )

    return _classifier


def detect_language(
    audio: np.ndarray,
    sample_rate: int = 16000,
) -> tuple[str | None, float]:
    """
    Detect spoken language from an audio segment.

    Returns:
        (language, confidence)

    Only en/hi/ta are returned because those are the languages
    represented in the trained prosody model.
    """

    y = np.asarray(audio, dtype=np.float32).reshape(-1)

    if y.size < int(sample_rate * 1.5):
        return None, 0.0

    if not np.isfinite(y).all():
        y = np.nan_to_num(y)

    peak = float(np.max(np.abs(y))) if y.size else 0.0

    if peak < 1e-4:
        return None, 0.0

    # Normalize only for language-ID inference.
    y = y / max(peak, 1e-8)

    waveform = torch.from_numpy(y).unsqueeze(0)

    classifier = _get_classifier()

    with torch.no_grad():
        probabilities, score, index, text_lab = (
            classifier.classify_batch(waveform)
        )

    label = str(text_lab[0]).strip().lower()

    # SpeechBrain labels can contain names such as:
    # "english", "hindi", "tamil", etc.
    aliases = {
        "english": "en",
        "en": "en",
        "hindi": "hi",
        "hi": "hi",
        "tamil": "ta",
        "ta": "ta",
    }

    language = aliases.get(label)

    if language not in SUPPORTED_LANGUAGES:
        return None, 0.0

    try:
        confidence = float(score[0])
    except Exception:
        confidence = 0.0

    return language, confidence


def get_cached_language(stream_id: str) -> str | None:
    with _stream_lock:
        return _stream_languages.get(stream_id)


def set_cached_language(
    stream_id: str,
    language: str | None,
) -> None:
    with _stream_lock:
        _stream_languages[stream_id] = language


def clear_cached_language(stream_id: str) -> None:
    with _stream_lock:
        _stream_languages.pop(stream_id, None)
