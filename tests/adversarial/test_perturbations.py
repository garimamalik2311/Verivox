"""Sanity tests for perturbation functions — shape/dtype/range preserved."""

import numpy as np
from src.adversarial.perturbations import add_white_noise, add_pink_noise, pitch_shift


def _dummy_audio():
    return np.random.uniform(-0.5, 0.5, 16000).astype(np.float32)


def test_white_noise_preserves_shape_and_range():
    audio = _dummy_audio()
    out = add_white_noise(audio, snr_db=10)
    assert out.shape == audio.shape
    assert out.dtype == np.float32
    assert np.max(np.abs(out)) <= 1.0


def test_pink_noise_preserves_shape_and_range():
    audio = _dummy_audio()
    out = add_pink_noise(audio, snr_db=10)
    assert out.shape == audio.shape
    assert np.max(np.abs(out)) <= 1.0


def test_pitch_shift_preserves_length():
    audio = _dummy_audio()
    out = pitch_shift(audio, n_semitones=2)
    assert len(out) == len(audio)