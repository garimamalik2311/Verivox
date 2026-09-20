import json

import numpy as np

from src.risk_engine.shap_engine import ShapEngine


class FakeExplainer:
    def __init__(self, values):
        self.values = np.asarray(values, dtype=np.float32)

    def shap_values(self, X):
        assert X.shape == (1, 58)
        return self.values


def build_engine():
    engine = object.__new__(ShapEngine)

    with open(
        "reports/feature_bucket_map.json",
        "r",
        encoding="utf-8",
    ) as f:
        engine._buckets = json.load(f)

    engine._model = object()
    engine._tree_model = object()

    return engine


def test_58d_bucket_contract():
    with open(
        "reports/feature_bucket_map.json",
        "r",
        encoding="utf-8",
    ) as f:
        buckets = json.load(f)

    assert buckets["Spectral"] == [13, 14, 15, 16, 17]

    assert buckets["MFCC"] == [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
        18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    ]

    assert buckets["MFCC Dynamics"] == list(range(30, 56))
    assert buckets["Pitch"] == [56, 57]

    assert "Prosody" not in buckets
    assert "Energy" not in buckets


def test_shap_uses_mfcc_dynamics_signal_not_timing():
    engine = build_engine()

    # Force SHAP to mark both spectral and MFCC-dynamics buckets
    # as materially contributing.
    values = np.zeros((1, 58), dtype=np.float32)

    values[0, 13] = 1.0
    values[0, 30] = 2.0

    engine._explainer = FakeExplainer(values)

    result = engine.explain(
        np.zeros(58, dtype=np.float32)
    )

    assert result["vocoder_flag"] is True
    assert "spectral_artifact" in result["diagnostic_cues"]
    assert "mfcc_dynamics_signal" in result["diagnostic_cues"]

    assert "flat_prosody_timing" not in result["diagnostic_cues"]


def test_shap_returns_real_58d_feature_evidence():
    engine = build_engine()

    values = np.zeros((1, 58), dtype=np.float32)

    values[0, 13] = 3.0
    values[0, 0] = -2.0
    values[0, 56] = 1.5

    engine._explainer = FakeExplainer(values)

    result = engine.explain(
        np.zeros(58, dtype=np.float32)
    )

    assert len(result["shap_features"]) == 5

    assert result["shap_features"][0]["index"] == 13
    assert result["shap_features"][0]["name"] == "Spectral Centroid"
    assert result["shap_features"][0]["direction"] == (
        "increases_synthetic_probability"
    )

    names = {
        item["name"]
        for item in result["shap_features"]
    }

    assert "MFCC 1" in names
    assert "F0 Mean" in names
