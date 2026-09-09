"""
Basic test suite for Sprint 1A modules.
Run with: pytest tests/
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import numpy as np
import pytest

from config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES, WINDOW_STRIDE_SAMPLES, VAD_FRAME_SAMPLES
from vad import VoiceActivityDetector
from window_accumulator import WindowAccumulator
from mock_consumer import validate_window, mock_extract_features, ContractViolation


def test_config_values():
    assert SAMPLE_RATE == 16000
    assert WINDOW_SIZE_SAMPLES == 16000
    assert WINDOW_STRIDE_SAMPLES == 8000


def test_vad_rejects_silence():
    vad = VoiceActivityDetector()
    silence = np.zeros(SAMPLE_RATE, dtype=np.float32)
    result = vad.filter_speech(silence)
    assert len(result) == 0


def test_vad_frame_length_validation():
    vad = VoiceActivityDetector()
    wrong_size_frame = np.zeros(100, dtype=np.float32)
    with pytest.raises(ValueError):
        vad.is_speech(wrong_size_frame)


def test_window_accumulator_overlap_math():
    acc = WindowAccumulator()
    audio = np.random.randn(int(SAMPLE_RATE * 2.5)).astype(np.float32)
    windows = acc.push(audio)
    # 2.5s of audio, 1s windows, 0.5s stride -> 4 full windows, 0.5s left in buffer
    assert len(windows) == 4
    for w in windows:
        assert len(w) == WINDOW_SIZE_SAMPLES


def test_window_accumulator_streaming_chunks():
    """Windows should come out the same whether pushed all at once or in small chunks."""
    audio = np.random.randn(int(SAMPLE_RATE * 2.5)).astype(np.float32)

    acc_bulk = WindowAccumulator()
    windows_bulk = acc_bulk.push(audio)

    acc_stream = WindowAccumulator()
    windows_stream = []
    for i in range(0, len(audio), 1600):
        windows_stream.extend(acc_stream.push(audio[i:i + 1600]))

    assert len(windows_bulk) == len(windows_stream)
    for wb, ws in zip(windows_bulk, windows_stream):
        assert np.allclose(wb, ws)


def test_window_accumulator_reset():
    acc = WindowAccumulator()
    acc.push(np.random.randn(SAMPLE_RATE).astype(np.float32))
    acc.reset()
    assert len(acc._buffer) == 0


def test_contract_accepts_valid_window():
    valid = np.zeros(WINDOW_SIZE_SAMPLES, dtype=np.float32)
    validate_window(valid)  # should not raise


def test_contract_rejects_wrong_shape():
    wrong_shape = np.zeros(8000, dtype=np.float32)
    with pytest.raises(ContractViolation):
        validate_window(wrong_shape)


def test_contract_rejects_wrong_dtype():
    wrong_dtype = np.zeros(WINDOW_SIZE_SAMPLES, dtype=np.float64)
    with pytest.raises(ContractViolation):
        validate_window(wrong_dtype)


def test_mock_extract_features_output_shape():
    valid = np.zeros(WINDOW_SIZE_SAMPLES, dtype=np.float32)
    features = mock_extract_features(valid)
    assert features.shape == (30,)
    assert features.dtype == np.float32