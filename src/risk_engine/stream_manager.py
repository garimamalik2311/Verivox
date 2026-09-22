from src.risk_engine.engine import RiskEngine
from src.risk_engine.schemas import ModelPrediction, RiskResult
from src.risk_engine.scenario_resolver import (
    ScenarioResolution,
    resolve_scenario,
)


class StreamManager:
    """Maintains an independent RiskEngine and policy context per stream."""

    def __init__(self):
        self._engines: dict[str, RiskEngine] = {}
        self._scenarios: dict[str, str] = {}
        self._scenario_sources: dict[str, str] = {}
        self._transaction_amounts: dict[str, float | None] = {}

    def configure_stream(
        self,
        stream_id: str,
        scenario: str = "routine_support",
        transaction_amount_inr: float | None = None,
    ) -> ScenarioResolution:
        """Create the stream RiskEngine using its resolved scenario policy."""

        resolution = resolve_scenario(
            requested_scenario=scenario,
            transaction_amount_inr=transaction_amount_inr,
        )

        selected = resolution.scenario

        if stream_id in self._engines:
            existing_scenario = self._scenarios[stream_id]
            existing_amount = self._transaction_amounts[
                stream_id
            ]

            if existing_scenario != selected.value:
                raise ValueError(
                    f"stream {stream_id!r} is already configured "
                    f"for scenario {existing_scenario!r}"
                )

            if existing_amount != resolution.transaction_amount_inr:
                raise ValueError(
                    f"stream {stream_id!r} already has a different "
                    "transaction context"
                )

            return resolution

        from src.risk_engine.notification_engine import POLICIES

        policy = POLICIES[selected]

        self._engines[stream_id] = RiskEngine(
            flag_threshold=policy.threshold,
            required_consecutive_flags=(
                policy.required_consecutive_flags
            ),
        )

        self._scenarios[stream_id] = selected.value
        self._scenario_sources[stream_id] = resolution.source
        self._transaction_amounts[
            stream_id
        ] = resolution.transaction_amount_inr

        return resolution

    def _get_engine(self, stream_id: str) -> RiskEngine:
        if stream_id not in self._engines:
            self.configure_stream(stream_id)

        return self._engines[stream_id]

    def update(self, prediction: ModelPrediction) -> RiskResult:
        """Process a prediction using the RiskEngine for its stream."""
        engine = self._get_engine(prediction.stream_id)
        return engine.update(prediction)

    def get_context(self, stream_id: str) -> dict:
        """Return the resolved policy context for a stream."""
        return {
            "scenario": self._scenarios.get(
                stream_id,
                "routine_support",
            ),
            "scenario_source": self._scenario_sources.get(
                stream_id,
                "default",
            ),
            "transaction_amount_inr": self._transaction_amounts.get(
                stream_id
            ),
        }

    def reset_stream(self, stream_id: str) -> None:
        """Reset the risk state for a stream."""
        if stream_id in self._engines:
            self._engines[stream_id].reset()

    def remove_stream(self, stream_id: str) -> None:
        """Remove a stream and release its RiskEngine state."""
        self._engines.pop(stream_id, None)
        self._scenarios.pop(stream_id, None)
        self._scenario_sources.pop(stream_id, None)
        self._transaction_amounts.pop(stream_id, None)

    def active_streams(self) -> list[str]:
        """Return the IDs of currently tracked streams."""
        return list(self._engines.keys())
