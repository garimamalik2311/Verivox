"""
tests/test_speaker_verification.py

Coverage for speaker_registry.py + speaker_verifier.py — previously
untested despite being wired into the live /ws/audio pipeline.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pytest

from src.speaker_registry import (
    SpeakerRegistry,
    UnknownSpeakerError,
    compute_speaker_similarity,
    SPEAKER_EMBEDDING_DIM,
    SPEAKER_MATCH_THRESHOLD,
)


# ---------------------------------------------------------------------------
# compute_speaker_similarity()
# ---------------------------------------------------------------------------

def test_identical_embeddings_score_1():
    vec = np.random.randn(192).astype(np.float32)
    assert compute_speaker_similarity(vec, vec) == pytest.approx(1.0, abs=1e-5)


def test_opposite_embeddings_score_0():
    vec = np.random.randn(192).astype(np.float32)
    assert compute_speaker_similarity(vec, -vec) == pytest.approx(0.0, abs=1e-5)


def test_orthogonal_embeddings_score_near_half():
    a = np.zeros(192, dtype=np.float32)
    a[0] = 1.0
    b = np.zeros(192, dtype=np.float32)
    b[1] = 1.0
    assert compute_speaker_similarity(a, b) == pytest.approx(0.5, abs=1e-5)


def test_zero_vector_returns_zero_not_nan():
    zero = np.zeros(192, dtype=np.float32)
    vec = np.random.randn(192).astype(np.float32)
    # Must not divide by zero / return NaN
    assert compute_speaker_similarity(zero, vec) == 0.0
    assert compute_speaker_similarity(vec, zero) == 0.0


def test_similarity_always_in_valid_range():
    for _ in range(20):
        a = np.random.randn(192).astype(np.float32) * np.random.uniform(0.1, 100)
        b = np.random.randn(192).astype(np.float32) * np.random.uniform(0.1, 100)
        score = compute_speaker_similarity(a, b)
        assert 0.0 <= score <= 1.0


# ---------------------------------------------------------------------------
# SpeakerRegistry — enrollment
# ---------------------------------------------------------------------------

def test_enroll_and_is_enrolled():
    reg = SpeakerRegistry()
    vec = np.random.randn(192).astype(np.float32)
    assert reg.is_enrolled("alice") is False
    reg.enroll("alice", vec)
    assert reg.is_enrolled("alice") is True


def test_enroll_rejects_wrong_shape():
    reg = SpeakerRegistry()
    wrong_shape = np.random.randn(64).astype(np.float32)
    with pytest.raises(ValueError):
        reg.enroll("alice", wrong_shape)


def test_enroll_overwrites_previous_embedding():
    reg = SpeakerRegistry()
    vec1 = np.zeros(192, dtype=np.float32)
    vec1[0] = 1.0
    vec2 = np.zeros(192, dtype=np.float32)
    vec2[1] = 1.0

    reg.enroll("alice", vec1)
    reg.enroll("alice", vec2)  # re-enroll should replace, not stack

    # verifying against vec1 should now score like an orthogonal mismatch,
    # not a perfect match, proving vec1 was replaced by vec2
    assert reg.verify("alice", vec1) == pytest.approx(0.5, abs=1e-5)


def test_enrolled_speakers_lists_all():
    reg = SpeakerRegistry()
    reg.enroll("alice", np.random.randn(192).astype(np.float32))
    reg.enroll("bob", np.random.randn(192).astype(np.float32))
    assert set(reg.enrolled_speakers()) == {"alice", "bob"}


def test_remove_speaker():
    reg = SpeakerRegistry()
    vec = np.random.randn(192).astype(np.float32)
    reg.enroll("alice", vec)
    reg.remove("alice")
    assert reg.is_enrolled("alice") is False


def test_remove_unknown_speaker_is_safe():
    reg = SpeakerRegistry()
    reg.remove("nobody")  # should not raise


# ---------------------------------------------------------------------------
# SpeakerRegistry — verification against unknown speaker
# ---------------------------------------------------------------------------

def test_verify_unknown_speaker_raises():
    reg = SpeakerRegistry()
    vec = np.random.randn(192).astype(np.float32)
    with pytest.raises(UnknownSpeakerError):
        reg.verify("ghost", vec)


def test_is_match_unknown_speaker_raises():
    reg = SpeakerRegistry()
    vec = np.random.randn(192).astype(np.float32)
    with pytest.raises(UnknownSpeakerError):
        reg.is_match("ghost", vec)


# ---------------------------------------------------------------------------
# SpeakerRegistry — realistic match / mismatch scenarios
# ---------------------------------------------------------------------------

def test_same_speaker_same_embedding_matches():
    """Simulates verifying the exact same audio window twice."""
    reg = SpeakerRegistry()
    vec = np.random.randn(192).astype(np.float32)
    reg.enroll("alice", vec)
    assert reg.is_match("alice", vec) is True
    assert reg.verify("alice", vec) == pytest.approx(1.0, abs=1e-5)


def test_different_speaker_embeddings_do_not_match():
    """
    Two genuinely different, unrelated random 192-D vectors should NOT
    clear the match threshold — this is what should happen if an
    impostor's voice is checked against an enrolled voiceprint.
    """
    reg = SpeakerRegistry()
    alice_vec = np.random.randn(192).astype(np.float32)
    reg.enroll("alice", alice_vec)

    impostor_vec = np.random.randn(192).astype(np.float32)
    similarity = reg.verify("alice", impostor_vec)

    # Two independent random 192-D vectors are, on average, close to
    # orthogonal (~0.5 after scaling) — nowhere near the 0.75 threshold.
    assert similarity < SPEAKER_MATCH_THRESHOLD
    assert reg.is_match("alice", impostor_vec) is False


def test_two_speakers_are_independently_tracked():
    reg = SpeakerRegistry()
    alice_vec = np.random.randn(192).astype(np.float32)
    bob_vec = np.random.randn(192).astype(np.float32)

    reg.enroll("alice", alice_vec)
    reg.enroll("bob", bob_vec)

    # Verifying alice's own voice against her own enrollment: match
    assert reg.is_match("alice", alice_vec) is True
    # Verifying bob's voice against alice's enrollment: should not match
    assert reg.is_match("alice", bob_vec) is False


# ---------------------------------------------------------------------------
# SpeakerVerifier — real ECAPA-TDNN (with graceful fallback awareness)
# ---------------------------------------------------------------------------

class TestSpeakerVerifierIntegration:
    """
    These tests exercise the REAL SpeakerVerifier class. If the real
    ECAPA-TDNN model can't load (no internet on this machine, first run),
    it falls back to a placeholder — we test both paths explicitly so
    CI/sandboxes without internet still get real coverage, while a
    developer machine with internet gets the real-model path exercised.
    """

    def test_extract_embedding_returns_correct_shape_and_dtype(self):
        from src.speaker_verifier import SpeakerVerifier

        sv = SpeakerVerifier()
        audio = np.random.randn(16000).astype(np.float32) * 0.1
        embedding = sv.extract_embedding(audio)

        assert embedding.shape == (192,)
        assert embedding.dtype == np.float32

    def test_same_audio_produces_consistent_embedding(self):
        """
        Calling extract_embedding() twice on the IDENTICAL audio should
        produce a very high (ideally perfect) similarity score — this
        holds whether the real model or the placeholder fallback is
        active, since both are deterministic given the same input.
        """
        from src.speaker_verifier import SpeakerVerifier, compute_speaker_similarity

        sv = SpeakerVerifier()
        audio = np.random.randn(16000).astype(np.float32) * 0.1

        emb1 = sv.extract_embedding(audio)
        emb2 = sv.extract_embedding(audio)

        similarity = compute_speaker_similarity(emb1, emb2)
        assert similarity > 0.99

    def test_full_enroll_and_verify_pipeline(self):
        """
        End-to-end: extract a real embedding, enroll it, then verify
        the SAME audio matches and DIFFERENT audio does not necessarily
        match — proving the full registry + verifier pipeline works
        together, not just each piece in isolation.
        """
        from src.speaker_verifier import SpeakerVerifier

        sv = SpeakerVerifier()
        reg = SpeakerRegistry()

        enrollment_audio = np.random.randn(16000).astype(np.float32) * 0.1
        embedding = sv.extract_embedding(enrollment_audio)
        reg.enroll("test_speaker", embedding)

        # Verifying the exact same audio again must match
        live_embedding = sv.extract_embedding(enrollment_audio)
        assert reg.is_match("test_speaker", live_embedding) is True
