from src.risk_engine.schemas import RiskLevel
from src.risk_engine.thresholds import (
    HIGH_ENTER_THRESHOLD,
    HIGH_EXIT_THRESHOLD,
    MEDIUM_THRESHOLD,
)


class RiskStateMachine:
    """Maintains the current risk level using hysteresis."""

    def __init__(self):
        self._state = RiskLevel.LOW

    @property
    def state(self) -> RiskLevel:
        return self._state

    def update(
        self,
        rolling_score: float,
        allow_high: bool = True,
        confirmed_ai: bool = False,
    ) -> RiskLevel:
        if not 0.0 <= rolling_score <= 1.0:
            raise ValueError("rolling_score must be between 0 and 1")

        if self._state == RiskLevel.LOW:
            if confirmed_ai:
                self._state = RiskLevel.HIGH
            elif allow_high and rolling_score >= HIGH_ENTER_THRESHOLD:
                self._state = RiskLevel.HIGH
            elif rolling_score >= MEDIUM_THRESHOLD:
                self._state = RiskLevel.MEDIUM

        elif self._state == RiskLevel.MEDIUM:
            if confirmed_ai:
                self._state = RiskLevel.HIGH
            elif allow_high and rolling_score >= HIGH_ENTER_THRESHOLD:
                self._state = RiskLevel.HIGH
            elif rolling_score < MEDIUM_THRESHOLD:
                self._state = RiskLevel.LOW

        elif self._state == RiskLevel.HIGH:
            if rolling_score <= HIGH_EXIT_THRESHOLD:
                if rolling_score >= MEDIUM_THRESHOLD:
                    self._state = RiskLevel.MEDIUM
                else:
                    self._state = RiskLevel.LOW

        return self._state

    def reset(self) -> None:
        self._state = RiskLevel.LOW