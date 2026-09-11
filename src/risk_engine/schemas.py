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


class RiskResult(BaseModel):
    schema_version: str = "1.0"

    stream_id: str
    window_id: int
    timestamp: float

    ai_probability: float = Field(ge=0.0, le=1.0)
    rolling_score: float = Field(ge=0.0, le=1.0)
    consecutive_flags: int = Field(ge=0)

    risk_level: RiskLevel

    alert_triggered: bool
    alert_reason: str | None = None

    model_version: str