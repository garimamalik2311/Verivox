"""
speaker_verifier.py
Person A (Garima) — Sprint 1: real ECAPA-TDNN speaker embedding.

Replaces the earlier placeholder (which generated random numbers seeded
off the audio, not an actual voice analysis) with a real pretrained
ECAPA-TDNN model via SpeechBrain, downloaded once from Hugging Face on
first use and cached locally under pretrained_models/.

compute_speaker_similarity() is UNCHANGED — it already worked correctly
on any two 192-D vectors, real or fake, so there was nothing to fix there.

NOTE: the first time this runs on any machine, it downloads ~80MB of
model weights from huggingface.co and needs internet access. After that
first run, it's cached locally and works offline.

KNOWN ISSUE (fixed below): running torch's multi-threaded tensor ops in
the same process as XGBoost/SHAP can segfault on macOS. This isn't the
"two copies of libomp" issue documented in the README (that one crashes
on *import*, before any real computation) — this one crashes *inside* a
real tensor operation, in OpenMP's own thread-barrier synchronization
code, confirmed via macOS crash report (functions like __kmp_suspend_64
and __kmp_fork_barrier). Since we only ever process one 1-second audio
window at a time, forcing torch to single-threaded mode avoids this
entirely, with no meaningful speed cost for our use case.
"""

import numpy as np

try:
    import torch
    torch.set_num_threads(1)  # see KNOWN ISSUE above — avoids an
                               # OpenMP thread-barrier segfault
    from speechbrain.inference.speaker import EncoderClassifier
    _SPEECHBRAIN_AVAILABLE = True
except ImportError:
    _SPEECHBRAIN_AVAILABLE = False


def compute_speaker_similarity(ref_embedding: np.ndarray, live_embedding: np.ndarray) -> float:
    """
    Computes Cosine Similarity between an enrolled speaker reference vector (192-D)
    and an incoming live window embedding.
    Returns: Scaled similarity score [0.0, 1.0].

    Unchanged from the original implementation.
    """
    dot_product = np.dot(ref_embedding, live_embedding)
    norm_ref = np.linalg.norm(ref_embedding)
    norm_live = np.linalg.norm(live_embedding)

    if norm_ref == 0.0 or norm_live == 0.0:
        return 0.0

    cosine_sim = dot_product / (norm_ref * norm_live)
    # Scale from [-1.0, 1.0] to [0.0, 1.0]
    scaled_sim = float(np.clip((cosine_sim + 1.0) / 2.0, 0.0, 1.0))
    return scaled_sim


class SpeakerVerifier:
    """
    Real ECAPA-TDNN 192-D speaker embedding extractor, via SpeechBrain's
    pretrained spkrec-ecapa-voxceleb model.

    The model is loaded once (lazily, on first extract_embedding() call)
    and reused across all subsequent calls — loading it is slow (~1-2s),
    running it on a 1s audio window is fast (well under the 15ms SLA on
    CPU for this model size, but should be profiled on real hardware).
    """

    def __init__(self, embedding_dim: int = 192,
                 model_source: str = "speechbrain/spkrec-ecapa-voxceleb",
                 savedir: str = "pretrained_models/spkrec-ecapa-voxceleb"):
        self.embedding_dim = embedding_dim
        self._model_source = model_source
        self._savedir = savedir
        self._classifier = None
        self._load_failed = False

    def _ensure_loaded(self) -> bool:
        """
        Lazily loads the real model on first use. Returns True if the
        real model is ready, False if it couldn't be loaded (no internet
        on first run, speechbrain/torch not installed, etc.) — callers
        fall back to the old random-based method rather than crashing.
        """
        if self._classifier is not None:
            return True
        if self._load_failed:
            return False
        if not _SPEECHBRAIN_AVAILABLE:
            print(
                "[speaker_verifier] speechbrain/torch not installed — "
                "falling back to placeholder embeddings. Run "
                "'pip install -r requirements.txt' to enable the real model."
            )
            self._load_failed = True
            return False

        try:
            print(
                f"[speaker_verifier] Loading real ECAPA-TDNN model "
                f"from {self._model_source} (first run downloads "
                f"~80MB, then caches locally)..."
            )
            self._classifier = EncoderClassifier.from_hparams(
                source=self._model_source,
                savedir=self._savedir,
            )
            print("[speaker_verifier] Real ECAPA-TDNN model loaded.")
            return True
        except Exception as exc:
            print(
                f"[speaker_verifier] Failed to load real model "
                f"({exc}) — falling back to placeholder embeddings. "
                f"Check internet access for the first-run download."
            )
            self._load_failed = True
            return False

    def _placeholder_embedding(self, audio_1s: np.ndarray) -> np.ndarray:
        """Original placeholder, kept only as a fallback (see _ensure_loaded)."""
        np.random.seed(int(np.sum(np.abs(audio_1s[:100])) * 1e5) % (2**32 - 1))
        vec = np.random.randn(self.embedding_dim).astype(np.float32)
        return vec / (np.linalg.norm(vec) + 1e-6)

    def extract_embedding(self, audio_1s: np.ndarray) -> np.ndarray:
        """
        Extracts a real 192-D ECAPA-TDNN speaker embedding vector from
        a 1-second, 16kHz, mono, float32 audio window.

        Falls back to the placeholder (random but deterministic per audio)
        embedding if the real model isn't available, so the rest of the
        pipeline (speaker_registry.py, compute_speaker_similarity) keeps
        working without crashing — just with lower-quality embeddings
        until the real model can load.
        """
        if not self._ensure_loaded():
            return self._placeholder_embedding(audio_1s)

        # SpeechBrain expects a torch tensor shaped (batch, samples)
        audio_tensor = torch.from_numpy(audio_1s.astype(np.float32)).unsqueeze(0)

        with torch.no_grad():
            output = self._classifier.encode_batch(audio_tensor)

        # encode_batch() returns shape (batch, 1, embedding_dim);
        # squeeze down to a flat (192,) numpy vector.
        embedding = output.squeeze().detach().numpy().astype(np.float32)

        if embedding.shape != (self.embedding_dim,):
            raise ValueError(
                f"Expected ({self.embedding_dim},) embedding from ECAPA-TDNN, "
                f"got {embedding.shape} — model output format may have changed."
            )

        return embedding
