from src.risk_engine.schemas import RiskLevel


class AlertManager:
    """Generates alerts when the risk state enters HIGH."""

    def __init__(self):
        self._alert_active = False

    def update(self, risk_level: RiskLevel) -> tuple[bool, str | None]:
        if risk_level == RiskLevel.HIGH:
            if not self._alert_active:
                self._alert_active = True
                return True, "persistent_high_ai_probability"

            return False, None

        # Once risk leaves HIGH, a future HIGH state can generate
        # a new alert.
        self._alert_active = False

        return False, None

    def reset(self) -> None:
        self._alert_active = False