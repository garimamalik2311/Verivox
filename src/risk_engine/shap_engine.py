
"""
shap_engine.py
Person A — Features 3 & 4 (Vocoder detection + SHAP explainability).

The production model is a calibrated XGBoost model saved as:

    reports/xgboost_58d_calibrated.joblib

The saved object is a sklearn CalibratedClassifierCV wrapper.
SHAP TreeExplainer cannot explain that wrapper directly, so this module:

    1. Loads the calibrated model.
    2. Extracts the underlying XGBoost estimator.
    3. Creates TreeExplainer for the underlying XGBoost model.
    4. Uses the calibrated model separately for normal probability
       inference elsewhere in the pipeline.

Feature buckets from reports/feature_bucket_map.json:

    Spectral       : indices [13:18]
    MFCC           : indices [0:13] + [18:30]
    MFCC Dynamics  : indices [30:56]
    Pitch          : indices [56:58]

NOTE:
The [30:56] features are MFCC delta / delta-delta features.
They describe spectral-envelope dynamics, not speech timing.

The [56:58] features are F0 mean and F0 standard deviation.

There is no standalone spectral-flatness or high-frequency-energy
feature slot. Vocoder detection therefore uses aggregate SHAP
importance of the Spectral bucket.
"""

import json
import os

import joblib
import numpy as np

try:
    import shap

    _SHAP_AVAILABLE = True

except ImportError:
    shap = None
    _SHAP_AVAILABLE = False


MODEL_PATH = "reports/xgboost_58d_calibrated.joblib"
BUCKET_MAP_PATH = "reports/feature_bucket_map.json"

# ---------------------------------------------------------------------------
# SHAP thresholds
# ---------------------------------------------------------------------------

SPECTRAL_ARTIFACT_THRESHOLD = 0.05
MFCC_DYNAMICS_SHAP_THRESHOLD = 0.05


class ShapEngine:
    """
    Loads the calibrated model and creates a SHAP TreeExplainer
    for its underlying XGBoost estimator.

    Important:

        CalibratedClassifierCV
                ↓
        underlying XGBoost estimator
                ↓
        SHAP TreeExplainer

    The calibrated model itself remains untouched and continues to
    be used by the main inference pipeline.
    """

    def __init__(
        self,
        model_path: str = MODEL_PATH,
        bucket_map_path: str = BUCKET_MAP_PATH,
    ):
        self._model = None
        self._tree_model = None
        self._explainer = None
        self._buckets: dict[str, list[int]] = {}

        # -------------------------------------------------------------------
        # Load model
        # -------------------------------------------------------------------

        if os.path.exists(model_path):

            try:

                self._model = joblib.load(
                    model_path
                )

                print(
                    f"[shap] Loaded model: {model_path}"
                )

                print(
                    f"[shap] Model type: "
                    f"{type(self._model).__name__}"
                )

            except Exception as exc:

                print(
                    f"[shap] Failed to load model: {exc}"
                )

                self._model = None

        else:

            print(
                f"[shap] Model not found: {model_path}"
            )

        # -------------------------------------------------------------------
        # Load feature bucket map
        # -------------------------------------------------------------------

        if os.path.exists(bucket_map_path):

            try:

                with open(
                    bucket_map_path,
                    "r",
                    encoding="utf-8",
                ) as f:

                    self._buckets = json.load(f)

                print(
                    f"[shap] Loaded bucket map: "
                    f"{bucket_map_path}"
                )

            except Exception as exc:

                print(
                    f"[shap] Failed to load bucket map: "
                    f"{exc}"
                )

        else:

            print(
                f"[shap] Bucket map not found: "
                f"{bucket_map_path}"
            )

        # -------------------------------------------------------------------
        # Create SHAP explainer
        # -------------------------------------------------------------------

        if self._model is not None and _SHAP_AVAILABLE:

            try:

                self._tree_model = (
                    self._extract_tree_model(
                        self._model
                    )
                )

                if self._tree_model is None:

                    print(
                        "[shap] Could not find underlying "
                        "XGBoost estimator."
                    )

                else:

                    print(
                        "[shap] Underlying tree model: "
                        f"{type(self._tree_model).__name__}"
                    )

                    self._explainer = (
                        shap.TreeExplainer(
                            self._tree_model
                        )
                    )

                    print(
                        "[shap] TreeExplainer initialized "
                        "successfully."
                    )

            except Exception as exc:

                print(
                    "[shap] Failed to initialize "
                    f"TreeExplainer: {exc}"
                )

                self._tree_model = None
                self._explainer = None

        elif not _SHAP_AVAILABLE:

            print(
                "[shap] SHAP is not installed. "
                "Running without SHAP explanations."
            )

    # ========================================================================
    # MODEL EXTRACTION
    # ========================================================================

    def _extract_tree_model(
        self,
        model,
    ):
        """
        Extract the underlying XGBoost estimator from the calibrated
        sklearn model.

        Handles common sklearn CalibratedClassifierCV layouts:

            CalibratedClassifierCV
                └── calibrated_classifiers_
                        └── estimator

        and older layouts where the estimator is available through
        base_estimator.

        Returns:
            Underlying XGBoost model or None.
        """

        # -------------------------------------------------------------------
        # Direct XGBoost model
        # -------------------------------------------------------------------

        model_type = type(model).__name__

        if model_type in {
            "XGBClassifier",
            "XGBRFClassifier",
        }:

            return model

        # -------------------------------------------------------------------
        # CalibratedClassifierCV
        # -------------------------------------------------------------------

        calibrated_classifiers = getattr(
            model,
            "calibrated_classifiers_",
            None,
        )

        if calibrated_classifiers:

            # Use the first fitted calibrated classifier.
            calibrated_classifier = (
                calibrated_classifiers[0]
            )

            # sklearn versions commonly expose the underlying estimator
            # through .estimator.
            estimator = getattr(
                calibrated_classifier,
                "estimator",
                None,
            )

            if estimator is not None:

                estimator_type = type(
                    estimator
                ).__name__

                print(
                    "[shap] Found calibrated estimator: "
                    f"{estimator_type}"
                )

                if estimator_type in {
                    "XGBClassifier",
                    "XGBRFClassifier",
                }:

                    return estimator

                # Handle a possible sklearn Pipeline.
                pipeline_model = (
                    self._extract_from_pipeline(
                        estimator
                    )
                )

                if pipeline_model is not None:
                    return pipeline_model

            # Some sklearn versions/layouts may expose
            # base_estimator instead.
            base_estimator = getattr(
                calibrated_classifier,
                "base_estimator",
                None,
            )

            if base_estimator is not None:

                base_type = type(
                    base_estimator
                ).__name__

                print(
                    "[shap] Found calibrated "
                    "base estimator: "
                    f"{base_type}"
                )

                if base_type in {
                    "XGBClassifier",
                    "XGBRFClassifier",
                }:

                    return base_estimator

                pipeline_model = (
                    self._extract_from_pipeline(
                        base_estimator
                    )
                )

                if pipeline_model is not None:
                    return pipeline_model

        # -------------------------------------------------------------------
        # Older sklearn CalibratedClassifierCV layout
        # -------------------------------------------------------------------

        base_estimator = getattr(
            model,
            "base_estimator",
            None,
        )

        if base_estimator is not None:

            base_type = type(
                base_estimator
            ).__name__

            if base_type in {
                "XGBClassifier",
                "XGBRFClassifier",
            }:

                return base_estimator

            pipeline_model = (
                self._extract_from_pipeline(
                    base_estimator
                )
            )

            if pipeline_model is not None:
                return pipeline_model

        # -------------------------------------------------------------------
        # Pipeline
        # -------------------------------------------------------------------

        pipeline_model = (
            self._extract_from_pipeline(model)
        )

        if pipeline_model is not None:
            return pipeline_model

        return None

    # ========================================================================
    # PIPELINE EXTRACTION
    # ========================================================================

    def _extract_from_pipeline(
        self,
        model,
    ):
        """
        Extract XGBoost estimator from an sklearn Pipeline.
        """

        named_steps = getattr(
            model,
            "named_steps",
            None,
        )

        if not named_steps:
            return None

        for step_name, step in reversed(
            list(named_steps.items())
        ):

            step_type = type(step).__name__

            if step_type in {
                "XGBClassifier",
                "XGBRFClassifier",
            }:

                print(
                    "[shap] Found XGBoost pipeline "
                    f"step: {step_name}"
                )

                return step

        return None

    # ========================================================================
    # READY CHECK
    # ========================================================================

    @property
    def is_ready(self) -> bool:
        """
        True only when both the underlying tree model and SHAP
        explainer are available.
        """

        return (
            self._tree_model is not None
            and self._explainer is not None
        )

    # ========================================================================
    # BUCKET IMPORTANCE
    # ========================================================================

    def _bucket_importance(
        self,
        shap_values: np.ndarray,
        bucket_name: str,
    ) -> float:
        """
        Calculate mean absolute SHAP importance for a feature bucket.
        """

        indices = self._buckets.get(
            bucket_name,
            [],
        )

        if not indices:
            return 0.0

        # Keep only valid indices.
        valid_indices = [
            i
            for i in indices
            if 0 <= i < len(shap_values)
        ]

        if not valid_indices:
            return 0.0

        return float(
            np.mean(
                np.abs(
                    shap_values[
                        valid_indices
                    ]
                )
            )
        )

    # ========================================================================
    # SHAP VALUE NORMALIZATION
    # ========================================================================

    def _normalize_shap_values(
        self,
        shap_values,
    ) -> np.ndarray:
        """
        Normalize different SHAP output formats into a 1-D vector.

        Depending on SHAP version/model configuration, TreeExplainer can
        return:

            (1, 58)
            (58,)
            (1, 58, 2)

        This function converts those into a single 58-D vector.
        """

        # Newer SHAP output can sometimes be an Explanation object.
        if hasattr(
            shap_values,
            "values",
        ):

            shap_values = shap_values.values

        shap_values = np.asarray(
            shap_values
        )

        # ---------------------------------------------------------------
        # Standard (1, 58)
        # ---------------------------------------------------------------

        if shap_values.ndim == 2:

            return shap_values[0]

        # ---------------------------------------------------------------
        # Standard (58,)
        # ---------------------------------------------------------------

        if shap_values.ndim == 1:

            return shap_values

        # ---------------------------------------------------------------
        # Possible multiclass output:
        #
        # (1, 58, 2)
        #
        # Use class 1 = AI/fake class.
        # ---------------------------------------------------------------

        if shap_values.ndim == 3:

            if (
                shap_values.shape[0] == 1
                and shap_values.shape[1] == 58
                and shap_values.shape[2] >= 2
            ):

                return shap_values[
                    0,
                    :,
                    1,
                ]

            # Generic fallback for one-sample output.
            if shap_values.shape[0] == 1:

                flattened = shap_values[0]

                if flattened.ndim == 2:

                    return flattened[:, -1]

        raise ValueError(
            "Unexpected SHAP output shape: "
            f"{shap_values.shape}"
        )

    # ========================================================================
    # EXPLAIN
    # ========================================================================

    def explain(
        self,
        feature_vector: np.ndarray,
    ) -> dict:
        """
        Explain one 58-D feature vector.

        Returns:

            {
                "vocoder_flag": bool,
                "diagnostic_cues": list[str],
                "shap_top_features": list[int]
            }

        If SHAP is unavailable or fails, returns a safe no-cues
        response so the live audio pipeline does not crash.
        """

        safe_result = {
            "vocoder_flag": False,
            "diagnostic_cues": [],
            "shap_top_features": [],
        }

        # -------------------------------------------------------------------
        # SHAP availability
        # -------------------------------------------------------------------

        if not self.is_ready:
            return safe_result

        # -------------------------------------------------------------------
        # Validate feature vector
        # -------------------------------------------------------------------

        try:

            feature_vector = np.asarray(
                feature_vector,
                dtype=np.float32,
            ).reshape(-1)

        except Exception as exc:

            print(
                f"[shap] Invalid feature vector: {exc}"
            )

            return safe_result

        if feature_vector.shape != (58,):

            print(
                "[shap] Invalid feature dimension: "
                f"expected 58, "
                f"got {feature_vector.shape}"
            )

            return safe_result

        if not np.all(
            np.isfinite(feature_vector)
        ):

            print(
                "[shap] Feature vector contains "
                "NaN or Inf."
            )

            return safe_result

        # -------------------------------------------------------------------
        # Calculate SHAP values
        # -------------------------------------------------------------------

        try:

            raw_shap_values = (
                self._explainer.shap_values(
                    feature_vector.reshape(
                        1,
                        -1,
                    )
                )
            )

            shap_values = (
                self._normalize_shap_values(
                    raw_shap_values
                )
            )

        except Exception as exc:

            print(
                f"[shap] Explanation failed: {exc}"
            )

            return safe_result

        # -------------------------------------------------------------------
        # Final dimensionality check
        # -------------------------------------------------------------------

        if shap_values.shape != (58,):

            print(
                "[shap] Unexpected normalized SHAP "
                f"shape: {shap_values.shape}"
            )

            return safe_result

        # -------------------------------------------------------------------
        # Diagnostic cues
        # -------------------------------------------------------------------

        cues = []

        # Spectral bucket.
        spectral_importance = (
            self._bucket_importance(
                shap_values,
                "Spectral",
            )
        )

        if (
            spectral_importance
            > SPECTRAL_ARTIFACT_THRESHOLD
        ):

            cues.append(
                "spectral_artifact"
            )

        # -------------------------------------------------------------------
        # -------------------------------------------------------------------
        # MFCC dynamics bucket.
        #
        # Indices [30:56] are MFCC delta/delta-delta features.
        # They describe spectral-envelope dynamics, not speech timing.
        # -------------------------------------------------------------------

        mfcc_dynamics_importance = (
            self._bucket_importance(
                shap_values,
                "MFCC Dynamics",
            )
        )

        if (
            mfcc_dynamics_importance
            > MFCC_DYNAMICS_SHAP_THRESHOLD
        ):

            cues.append(
                "mfcc_dynamics_signal"
            )

        # Top 5 SHAP features
        # -------------------------------------------------------------------

        top_features = list(
            np.argsort(
                -np.abs(shap_values)
            )[:5]
        )

        # Feature names follow the 58-D extractor contract in features.py.
        def feature_name(index: int) -> str:

            if 0 <= index <= 12:
                return f"MFCC {index + 1}"

            if index == 13:
                return "Spectral Centroid"

            if index == 14:
                return "Spectral Bandwidth"

            if index == 15:
                return "Spectral Rolloff"

            if index == 16:
                return "Zero-Crossing Rate"

            if index == 17:
                return "RMS Energy"

            if 18 <= index <= 29:
                return f"Chroma {index - 17}"

            if 30 <= index <= 42:
                return f"MFCC Delta {index - 29}"

            if 43 <= index <= 55:
                return f"MFCC Delta-Delta {index - 42}"

            if index == 56:
                return "F0 Mean"

            if index == 57:
                return "F0 Std Dev"

            return f"Feature {index}"

        shap_features = []

        for index in top_features:

            value = float(shap_values[index])

            shap_features.append({
                "index": int(index),
                "name": feature_name(int(index)),
                "value": value,
                "abs_value": abs(value),
                "direction": (
                    "increases_synthetic_probability"
                    if value > 0
                    else "decreases_synthetic_probability"
                    if value < 0
                    else "neutral"
                ),
            })

        return {
            "vocoder_flag": (
                "spectral_artifact"
                in cues
            ),
            "diagnostic_cues": cues,
            "shap_top_features": [
                int(i)
                for i in top_features
            ],
            "shap_features": shap_features,
        }

