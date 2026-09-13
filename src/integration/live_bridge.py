"""
file_bridge.py

Connects the Sprint 1 file pipeline to the Sprint 2B calibrated classifier
and sends ModelPrediction messages to the Sprint 3B WebSocket Risk Engine.

Flow:
audio file -> VAD -> speech windows -> 30-D features
-> calibrated XGBoost -> ModelPrediction -> WebSocket -> Risk Engine
"""

import asyncio
import time

import joblib
import websockets

from features import extract_features
from pipeline import process_file_with_timestamps
from risk_engine.schemas import ModelPrediction


MODEL_PATH = "reports/xgboost_calibrated.joblib"
MODEL_VERSION = "sprint2a-xgb-v1-calibrated"

WEBSOCKET_URL = "ws://127.0.0.1:8000/ws"

STREAM_ID = "call_001"

AUDIO_FILE = "data/WhatsApp Ptt 2026-09-09 at 4.11.59 PM.ogg"


model = joblib.load(MODEL_PATH)


async def run_file_bridge(filepath: str) -> None:
    """Run a real audio file through the complete VeriVox pipeline."""

    print("\n=== VeriVox File Bridge ===")
    print(f"Audio: {filepath}")
    print(f"Stream ID: {STREAM_ID}")
    print(f"Model: {MODEL_VERSION}")
    print(f"WebSocket: {WEBSOCKET_URL}")
    print()

    windows = process_file_with_timestamps(filepath)

    print(f"Speech windows: {len(windows)}")
    print()

    async with websockets.connect(WEBSOCKET_URL) as websocket:
        print("Connected to Risk Engine WebSocket\n")

        for window_id, (audio_window, timestamp) in enumerate(windows, start=1):

            start_time = time.perf_counter()

            features = extract_features(audio_window)

            if features.shape != (30,):
                raise ValueError(
                    f"Expected 30-D feature vector, got {features.shape}"
                )

            ai_probability = float(
                model.predict_proba(
                    features.reshape(1, -1)
                )[0, 1]
            )

            latency_ms = (
                time.perf_counter() - start_time
            ) * 1000.0

            prediction = ModelPrediction(
                stream_id=STREAM_ID,
                window_id=window_id,
                timestamp=float(timestamp),
                ai_probability=ai_probability,
                model_version=MODEL_VERSION,
            )

            await websocket.send(
                prediction.model_dump_json()
            )

            response = await websocket.recv()

            print(
                f"window={window_id:<3} "
                f"time={timestamp:>6.2f}s "
                f"AI={ai_probability:.3f} "
                f"features={features.shape} "
                f"latency={latency_ms:.2f}ms"
            )

            print(f"  Risk Engine → {response}")

    print("\n=== File bridge complete ===")


def main() -> None:
    asyncio.run(
        run_file_bridge(AUDIO_FILE)
    )


if __name__ == "__main__":
    main()