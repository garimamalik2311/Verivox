"""
shap_engine.py
Person A — Features 3 & 4 (Vocoder detection + SHAP explainability).

Wraps shap.TreeExplainer around the real trained model
(reports/xgboost_58d_calibrated.joblib) to turn a raw AI-probability
score into human-readable diagnostic cues, using the bucket layout
from reports/feature_bucket_map.json:

    Spectral : indices [13:18]  (centroid, bandwidth, rolloff, zcr, rms)
    MFCC     : indices [0:13] + [18:30]
    Prosody  : indices [30:56] (delta / delta-delta MFCCs, per teammate's
               bucket map — NOTE: this bucket is mislabeled "Prosody" in
               feature_bucket_map.json; the *actual* pitch/prosody signal
               lives at [56:58], which that file labels "Energy". Flagging
               this mismatch for the team rather than silently working
               around it.)
    Energy   : indices [56:58] (per bucket map — actually pitch F0 mean/std)

There is no standalone "spectral flatness" or "high-frequency energy
ratio" feature slot — Person B's extractor folds those into rolloff (15)
and rms (17) as multipliers rather than separate values. So vocoder
detection here keys off aggregate SHAP importance on the Spectral bucket,
not a dedicated flatness index.
"""

import json
import os

import joblib
import numpy as np

try:
    import shap
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False

MODEL_PATH = "reports/xgboost_58d_calibrated.joblib"
BUCKET_MAP_PATH = "reports/feature_bucket_map.json"

# SHAP importance (mean |shap_value| across the bucket) above this
# threshold triggers the corresponding diagnostic cue. Placeholder —
# needs tuning against real labeled fake/real calls.
SPECTRAL_ARTIFACT_THRESHOLD = 0.05
FLAT_TIMING_SHAP_THRESHOLD = 0.05


class ShapEngine:
    """
    Loads the real calibrated model + explainer once, then produces
    diagnostic cues + a vocoder flag per feature vector on demand.
    """

    def __init__(self, model_path: str = MODEL_PATH,
                 bucket_map_path: str = BUCKET_MAP_PATH):
        self._model = None
        self._explainer = None
        self._buckets: dict[str, list[int]] = {}

        if os.path.exists(model_path):
            self._model = joblib.load(model_path)
            if _SHAP_AVAILABLE:
                self._explainer = shap.TreeExplainer(self._model)

        if os.path.exists(bucket_map_path):
            with open(bucket_map_path) as f:
                self._buckets = json.load(f)

    @property
    def is_ready(self) -> bool:
        """False until both the real model and SHAP are available."""
        return self._model is not None and self._explainer is not None

    def _bucket_importance(self, shap_values: np.ndarray, bucket_name: str) -> float:
        indices = self._buckets.get(bucket_name, [])
        if not indices:
            return 0.0
        return float(np.mean(np.abs(shap_values[indices])))

    def explain(self, feature_vector: np.ndarray) -> dict:
        """
        Args:
            feature_vector: the 58-D feature array for one window

        Returns:
            {
                "vocoder_flag": bool,
                "diagnostic_cues": list[str],
                "shap_top_features": list[int],  # indices with highest |shap value|
            }

        If the real model/SHAP isn't available yet, returns a safe
        no-cues default rather than raising, so the pipeline degrades
        gracefully instead of crashing.
        """
        if not self.is_ready:
            return {
                "vocoder_flag": False,
                "diagnostic_cues": [],
                "shap_top_features": [],
            }

        shap_values = self._explainer.shap_values(feature_vector.reshape(1, -1))[0]

        cues = []

        spectral_importance = self._bucket_importance(shap_values, "Spectral")
        if spectral_importance > SPECTRAL_ARTIFACT_THRESHOLD:
            cues.append("spectral_artifact")

        # NOTE: using the bucket map's literal "Prosody" key (indices [30:56],
        # i.e. delta/delta2 MFCCs) since that's what the file defines — even
        # though this is not literally pitch/prosody. See module docstring.
        prosody_importance = self._bucket_importance(shap_values, "Prosody")
        if prosody_importance > FLAT_TIMING_SHAP_THRESHOLD:
            cues.append("flat_prosody_timing")

        top_features = list(np.argsort(-np.abs(shap_values))[:5])

        return {
            "vocoder_flag": "spectral_artifact" in cues,
            "diagnostic_cues": cues,
            "shap_top_features": [int(i) for i in top_features],
        }
