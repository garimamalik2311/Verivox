from src.risk_engine.schemas import ModelPrediction
from src.risk_engine.stream_manager import StreamManager


def run_scenario(
    name: str,
    probabilities: list[float],
    stream_id: str = "demo_call",
) -> None:
    """Run a sequence of model predictions through the Risk Engine."""

    manager = StreamManager()

    print(f"\n=== {name} ===")
    print(
        f"{'WINDOW':<8}"
        f"{'AI_PROB':<10}"
        f"{'ROLLING':<10}"
        f"{'FLAGS':<8}"
        f"{'RISK':<10}"
        f"ALERT"
    )
    print("-" * 60)

    for window_id, probability in enumerate(probabilities, start=1):
        prediction = ModelPrediction(
            stream_id=stream_id,
            window_id=window_id,
            timestamp=float(window_id),
            ai_probability=probability,
            model_version="xgb_v1",
        )

        result = manager.update(prediction)

        alert = "🚨" if result.alert_triggered else "-"

        print(
            f"{result.window_id:<8}"
            f"{result.ai_probability:<10.3f}"
            f"{result.rolling_score:<10.3f}"
            f"{result.consecutive_flags:<8}"
            f"{result.risk_level.value:<10}"
            f"{alert}"
        )


def main() -> None:
    run_scenario(
        "NORMAL",
        [0.12, 0.18, 0.21, 0.15, 0.20],
    )

    run_scenario(
        "SINGLE SPIKE",
        [0.12, 0.91, 0.18, 0.20, 0.16],
    )

    run_scenario(
        "PERSISTENT DEEPFAKE",
        [0.82, 0.86, 0.91, 0.88, 0.90],
    )

    run_scenario(
        "RECOVERY",
        [0.82, 0.86, 0.91, 0.88, 0.40, 0.20, 0.15, 0.10, 0.08],                                                                                                                       
    )


if __name__ == "__main__":
    main()
