from src.risk_engine.engine import RiskEngine
from src.risk_engine.schemas import ModelPrediction, RiskResult
from src.risk_engine.notification_engine import (
    POLICIES,
    Scenario,
)


class StreamManager:
    """Maintains an independent RiskEngine for each active stream."""

    def __init__(self):
        self._engines: dict[str, RiskEngine] = {}
        self._scenarios: dict[str, Scenario] = {}

    def configure_stream(
        self,
        stream_id: str,
        scenario: str = "routine_support",
    ) -> None:
        """Create the stream RiskEngine using its scenario policy."""

        try:
            selected = Scenario(scenario)
        except ValueError:
            selected = Scenario.ROUTINE_SUPPORT

        if stream_id in self._engines:
            existing = self._scenarios[stream_id]

            if existing != selected:
                raise ValueError(
                    f"stream {stream_id!r} is already configured "
                    f"for scenario {existing.value!r}"
                )

            return

        policy = POLICIES[selected]

        self._engines[stream_id] = RiskEngine(
            flag_threshold=policy.threshold,
            required_consecutive_flags=(
                policy.required_consecutive_flags
            ),
        )
        self._scenarios[stream_id] = selected

    def _get_engine(self, stream_id: str) -> RiskEngine:
        if stream_id not in self._engines:
            self.configure_stream(stream_id)

        return self._engines[stream_id]

    def update(self, prediction: ModelPrediction) -> RiskResult:
        """Process a prediction using the RiskEngine for its stream."""
        engine = self._get_engine(prediction.stream_id)
        return engine.update(prediction)

    def reset_stream(self, stream_id: str) -> None:
        """Reset the risk state for a stream."""
        if stream_id in self._engines:
            self._engines[stream_id].reset()

    def remove_stream(self, stream_id: str) -> None:
        """Remove a stream and release its RiskEngine state."""
        self._engines.pop(stream_id, None)
        self._scenarios.pop(stream_id, None)

    def active_streams(self) -> list[str]:
        """Return the IDs of currently tracked streams."""
        return list(self._engines.keys())
