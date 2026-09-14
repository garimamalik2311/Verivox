"""
speaker_registry.py
Person A — Feature 2 (Speaker Verification storage layer).

speaker_verifier.py (Person B) already provides:
    - SpeakerVerifier.extract_embedding(audio) -> 192-D vector
    - compute_speaker_similarity(ref, live) -> float [0.0, 1.0]

What's missing, and what this file provides: somewhere to actually STORE
enrolled speaker vectors, keyed by speaker_id, so a live call's speaker_id
(from the /ws/audio query params, same pattern as stream_id) can be looked
up and verified against.

In-memory only for now — does not persist across server restarts. Flagged
as a known limitation; swap _registry for a real DB/redis-backed store
before production use.
"""

import numpy as np

from src.speaker_verifier import compute_speaker_similarity

SPEAKER_EMBEDDING_DIM = 192

# Below this similarity score, a live speaker is considered NOT a match
# for the enrolled voiceprint. Placeholder — needs tuning against real
# enrolled/impostor pairs before being trusted in production.
SPEAKER_MATCH_THRESHOLD = 0.75


class UnknownSpeakerError(Exception):
    """Raised when verifying against a speaker_id that was never enrolled."""
    pass


class SpeakerRegistry:
    """In-memory store of enrolled 192-D speaker embeddings."""

    def __init__(self):
        self._registry: dict[str, np.ndarray] = {}

    def enroll(self, speaker_id: str, embedding: np.ndarray) -> None:
        """
        Store an enrolled speaker's reference embedding.

        Args:
            speaker_id: unique identifier for this speaker
            embedding: 192-D np.ndarray from SpeakerVerifier.extract_embedding()
        """
        if embedding.shape != (SPEAKER_EMBEDDING_DIM,):
            raise ValueError(
                f"Expected ({SPEAKER_EMBEDDING_DIM},) embedding, "
                f"got {embedding.shape}"
            )
        self._registry[speaker_id] = embedding.astype(np.float32)

    def is_enrolled(self, speaker_id: str) -> bool:
        return speaker_id in self._registry

    def verify(self, speaker_id: str, live_embedding: np.ndarray) -> float:
        """
        Compare a live embedding against the enrolled reference for
        speaker_id.

        Returns:
            Cosine similarity score [0.0, 1.0]

        Raises:
            UnknownSpeakerError if speaker_id was never enrolled.
        """
        if speaker_id not in self._registry:
            raise UnknownSpeakerError(
                f"No enrolled voiceprint for speaker_id={speaker_id!r}"
            )
        reference = self._registry[speaker_id]
        return compute_speaker_similarity(reference, live_embedding)

    def is_match(self, speaker_id: str, live_embedding: np.ndarray) -> bool:
        """True if verify() score clears SPEAKER_MATCH_THRESHOLD."""
        return self.verify(speaker_id, live_embedding) >= SPEAKER_MATCH_THRESHOLD

    def remove(self, speaker_id: str) -> None:
        self._registry.pop(speaker_id, None)

    def enrolled_speakers(self) -> list[str]:
        return list(self._registry.keys())


def parse_speaker_id_from_query(websocket) -> str | None:
    """
    Read speaker_id off /ws/audio query params, mirroring exactly how
    stream_id is already read in src/websocket/server.py:

        stream_id = websocket.query_params.get("stream_id", "browser_mic_001")

    Returns None if no speaker_id was supplied (verification is optional
    per-call — a call with no speaker_id simply skips speaker verification).
    """
    return websocket.query_params.get("speaker_id", None)
