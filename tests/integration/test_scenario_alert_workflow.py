import asyncio
import json

import websockets


WS_URL = (
    "ws://127.0.0.1:8000/ws"
    "?stream_id=pytest_high_value_scenario_v1"
    "&scenario=high_value_transaction"
)


def test_high_value_transaction_alerts_after_two_windows():
    async def run_test():
        async with websockets.connect(WS_URL) as websocket:
            results = []

            for window_id, probability in enumerate(
                [0.82, 0.86],
                start=1,
            ):
                await websocket.send(
                    json.dumps(
                        {
                            "stream_id": "pytest_high_value_scenario_v1",
                            "window_id": window_id,
                            "timestamp": 1000.0 + window_id * 0.5,
                            "ai_probability": probability,
                            "model_version": "test-model",
                        }
                    )
                )

                response = json.loads(
                    await websocket.recv()
                )
                results.append(response)

            assert len(results) == 2

            # First qualifying window: no alert yet.
            assert results[0]["alert_triggered"] is False
            assert results[0]["consecutive_flags"] == 1

            # High-value transaction policy: alert on 2nd window.
            assert results[1]["alert_triggered"] is True
            assert results[1]["consecutive_flags"] == 2
            assert results[1]["risk_level"] == "HIGH"
            assert (
                results[1]["alert_reason"]
                == "persistent_high_ai_probability"
            )

    asyncio.run(run_test())
