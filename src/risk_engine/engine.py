from src.risk_engine.aggregation import rolling_mean
from src.risk_engine.alert_manager import AlertManager
from src.risk_engine.buffer import RollingBuffer
from src.risk_engine.schemas import ModelPrediction, RiskLevel, RiskResult
from src.risk_engine.state_machine import RiskStateMachine
from src.risk_engine.thresholds import (
    FLAG_THRESHOLD,
    HIGH_ENTER_THRESHOLD,
    REQUIRED_CONSECUTIVE_FLAGS,
    ROLLING_WINDOW_SIZE,
)


class RiskEngine:
    """Combines buffering, aggregation, risk state, and alerting."""

    def __init__(
        self,
        buffer_size: int = ROLLING_WINDOW_SIZE,
        flag_threshold: float = FLAG_THRESHOLD,
        required_consecutive_flags: int = REQUIRED_CONSECUTIVE_FLAGS,
    ):
        self.buffer = RollingBuffer(max_size=buffer_size)
        self.state_machine = RiskStateMachine()
        self.alert_manager = AlertManager()

        self.flag_threshold = flag_threshold
        self.required_consecutive_flags = required_consecutive_flags

        self._consecutive_flags = 0
        self._last_window_id: int | None = None

    def update(self, prediction: ModelPrediction) -> RiskResult:
        """Process one model prediction."""

        # Reject duplicate or out-of-order predictions.
        if (
            self._last_window_id is not None
            and prediction.window_id <= self._last_window_id
        ):
            raise ValueError(
                f"window_id must be greater than {self._last_window_id}"
            )

        self._last_window_id = prediction.window_id

        # 1. Add prediction to rolling buffer.
        self.buffer.add(prediction.ai_probability)

        # 2. Calculate rolling score.
        rolling_score = rolling_mean(self.buffer.values())

        # 3. Update consecutive suspicious-window count.
        if prediction.ai_probability >= self.flag_threshold:
            self._consecutive_flags += 1
        else:
            self._consecutive_flags = 0

        # 4. Determine whether HIGH evidence is persistent enough.
        high_allowed = (
            rolling_score >= HIGH_ENTER_THRESHOLD
            and self._consecutive_flags >= self.required_consecutive_flags
        )

        # 5. Update risk state.
        risk_level = self.state_machine.update(
    rolling_score,
    allow_high=high_allowed,
)
        
        # 6. Generate alert only when entering HIGH.
        alert_triggered, alert_reason = self.alert_manager.update(risk_level)

        return RiskResult(
            stream_id=prediction.stream_id,
            window_id=prediction.window_id,
            timestamp=prediction.timestamp,
            ai_probability=prediction.ai_probability,
            rolling_score=rolling_score,
            consecutive_flags=self._consecutive_flags,
            risk_level=risk_level,
            alert_triggered=alert_triggered,
            alert_reason=alert_reason,
            model_version=prediction.model_version,
        )

    def reset(self) -> None:
        """Reset the engine to its initial state."""

        self.buffer.clear()
        self.state_machine.reset()
        self.alert_manager.reset()

        self._consecutive_flags = 0
        self._last_window_id = None