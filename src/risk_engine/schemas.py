from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ModelPrediction(BaseModel):
    schema_version: str = "1.0"

    stream_id: str
    window_id: int = Field(ge=1)
    timestamp: float
    ai_probability: float = Field(ge=0.0, le=1.0)
    model_version: str

class ProsodyAnalysis(BaseModel):
    pitch_mean_hz: float | None = None
    pitch_std_hz: float | None = None
    pitch_variance_percent: float | None = None
    timing_variance: float | None = None
    flat_prosody: bool | None = None

    # Supporting ML evidence. This does not replace ai_probability.
    spoof_probability: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )
    signal: str = "UNAVAILABLE"
    model_version: str | None = None


class RiskResult(BaseModel):
    schema_version: str = "1.0"

    stream_id: str
    window_id: int
    timestamp: float

    ai_probability: float = Field(ge=0.0, le=1.0)
    rolling_score: float = Field(ge=0.0, le=1.0)
    consecutive_flags: int = Field(ge=0)
    yin_analysis: dict | None = None

    risk_level: RiskLevel

    alert_triggered: bool
    alert_reason: str | None = None

    # --- SIH Notification & Response Layer ---
    notification_scenario: str = "routine_support"
    notification_triggered: bool = False
    notification_threshold: float | None = None
    notification_required_consecutive_flags: int | None = None
    notification_severity: str = "NONE"
    notification_title: str | None = None
    notification_message: str | None = None
    recommended_actions: list[str] = Field(default_factory=list)
    dispatch_channels: list[str] = Field(default_factory=list)
    dispatch_results: list[dict] = Field(default_factory=list)
    privacy_mode: str = "feature_only"

    # --- Scenario / transaction context ---
    transaction_amount_inr: float | None = None
    scenario_source: str = "default"
    response_workflow_status: str = "INACTIVE"

    model_version: str

    # --- Added by Person A (Sprint 1B: Features 1, 2, 3, 4) ---
    # All new fields default to a safe "no signal" value so existing
    # consumers (e.g. the /ws ModelPrediction-only path, which never
    # sets these) keep working unchanged.

    # Feature 1 — Prosody
    prosody: ProsodyAnalysis = Field(default_factory=ProsodyAnalysis)

    # Feature 2 — Speaker Verification
    speaker_id: str | None = None
    speaker_similarity: float | None = None
    speaker_match: bool | None = None

    # Features 3 & 4 — Vocoder + SHAP
    vocoder_flag: bool = False
    diagnostic_cues: list[str] = Field(default_factory=list)
    shap_top_features: list[int] = Field(default_factory=list)

    # Detailed SHAP explanation for Deep Analytics.
    # Contains the top feature identity, contribution magnitude,
    # and contribution direction.
    shap_features: list[dict] = Field(default_factory=list)

    # Sprint 1B SLA tracking
    latency_ms: float | None = None
    sla_breach: bool = False

    # --- Dual-Stream Neural Acoustic Fusion (MMS-300M + 58-D DSP) & Ensemble ---
    xgb_probability: float | None = None
    dual_stream_probability: float | None = None
    dual_stream_risk: str | None = None
    modality_gate_alpha: float | None = None
    dual_stream_latency_ms: float | None = None
    target_languages: list[str] = Field(default_factory=lambda: ["en", "hi", "ta"])
<<<<<<< HEAD
    ensemble_mode: str = "xgb_mms300m_fusion"
=======
    ensemble_mode: str = "xgb_mms300m_fusion"
>>>>>>> origin/feature/audio-features-dataset
