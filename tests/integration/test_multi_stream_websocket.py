import asyncio
import json

import websockets


WS_URL = "ws://127.0.0.1:8000/ws"


async def run_stream(
    stream_id: str,
    probabilities: list[float],
):
    """Send a persistent sequence of predictions for one stream."""

    results = []

    uri = f"{WS_URL}?stream_id={stream_id}"

    async with websockets.connect(uri) as websocket:

        for window_id, ai_probability in enumerate(
            probabilities,
            start=1,
        ):
            prediction = {
                "schema_version": "1.0",
                "stream_id": stream_id,
                "window_id": window_id,
                "timestamp": float(window_id),
                "ai_probability": ai_probability,
                "model_version": "test-model",
            }

            await websocket.send(json.dumps(prediction))

            response = await websocket.recv()

            result = json.loads(response)
            results.append(result)

    return results


def test_multiple_streams_are_isolated():
    """
    Verify that two simultaneous persistent streams maintain
    completely independent Risk Engine state.
    """

    async def run_test():

        high_stream = "pytest_high_stream_v4"
        low_stream = "pytest_low_stream_v4"

        high_probabilities = [0.95] * 6
        low_probabilities = [0.10] * 6

        # Run both persistent WebSocket connections concurrently.
        high_results, low_results = await asyncio.gather(
            run_stream(
                high_stream,
                high_probabilities,
            ),
            run_stream(
                low_stream,
                low_probabilities,
            ),
        )

        # ---------------------------------------------------------
        # Result count
        # ---------------------------------------------------------

        assert len(high_results) == 6
        assert len(low_results) == 6

        # ---------------------------------------------------------
        # HIGH stream
        # ---------------------------------------------------------

        assert high_results[-1]["risk_level"] == "HIGH"
        assert high_results[-1]["rolling_score"] == 0.95
        assert high_results[-1]["consecutive_flags"] == 6

        # ---------------------------------------------------------
        # HIGH alert
        # ---------------------------------------------------------

        alert_results = [
            result
            for result in high_results
            if result["alert_triggered"]
        ]

        # Exactly one alert during the entire stream.
        assert len(alert_results) == 1

        # HIGH is entered after 4 consecutive suspicious windows.
        assert alert_results[0]["window_id"] == 4

        assert alert_results[0]["risk_level"] == "HIGH"

        assert (
            alert_results[0]["alert_reason"]
            == "persistent_high_ai_probability"
        )

        # ---------------------------------------------------------
        # LOW stream
        # ---------------------------------------------------------

        assert all(
            result["risk_level"] == "LOW"
            for result in low_results
        )

        assert low_results[-1]["rolling_score"] == 0.10
        assert low_results[-1]["consecutive_flags"] == 0

        # LOW stream must never alert.
        assert not any(
            result["alert_triggered"]
            for result in low_results
        )

        # ---------------------------------------------------------
        # Stream IDs must remain isolated
        # ---------------------------------------------------------

        assert all(
            result["stream_id"] == high_stream
            for result in high_results
        )

        assert all(
            result["stream_id"] == low_stream
            for result in low_results
        )

        # ---------------------------------------------------------
        # Window IDs
        # ---------------------------------------------------------

        assert [
            result["window_id"]
            for result in high_results
        ] == [1, 2, 3, 4, 5, 6]

        assert [
            result["window_id"]
            for result in low_results
        ] == [1, 2, 3, 4, 5, 6]

        # ---------------------------------------------------------
        # Model versions
        # ---------------------------------------------------------

        assert all(
            result["model_version"] == "test-model"
            for result in high_results
        )

        assert all(
            result["model_version"] == "test-model"
            for result in low_results
        )

        # ---------------------------------------------------------
        # Final isolation check
        # ---------------------------------------------------------

        assert high_results[-1]["rolling_score"] > 0.70
        assert low_results[-1]["rolling_score"] < 0.50

    asyncio.run(run_test())


if __name__ == "__main__":
    test_multiple_streams_are_isolated()