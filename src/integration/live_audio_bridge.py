"""
live_audio_bridge.py

Connects the live microphone to the Sprint 2B calibrated classifier
and sends ModelPrediction messages to the Sprint 3B WebSocket Risk Engine.

Flow:
microphone -> VAD -> speech windows -> 30-D features
-> calibrated XGBoost -> ModelPrediction -> WebSocket -> Risk Engine
"""

import asyncio
import json
import time

import joblib
import websockets

from src.features import extract_features
from src.mic_capture import MicrophoneStreamer
from src.risk_engine.schemas import ModelPrediction
from src.vad import VoiceActivityDetector
from src.window_accumulator import WindowAccumulator


MODEL_PATH = "reports/xgboost_calibrated.joblib"
MODEL_VERSION = "sprint2a-xgb-v1-calibrated"

WEBSOCKET_URL = "ws://127.0.0.1:8000/ws"

STREAM_ID = "mic_001"

MIC_BLOCKSIZE = 320


model = joblib.load(MODEL_PATH)


async def run_live_audio_bridge() -> None:
    """Run live microphone audio through the complete VeriVox pipeline."""

    print("\n=== VeriVox Live Audio Bridge ===")
    print(f"Stream ID: {STREAM_ID}")
    print(f"Model: {MODEL_VERSION}")
    print(f"WebSocket: {WEBSOCKET_URL}")
    print()

    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()
    streamer = MicrophoneStreamer(blocksize=MIC_BLOCKSIZE)

    window_id = 0

    async with websockets.connect(WEBSOCKET_URL) as websocket:
        print("Connected to Risk Engine WebSocket")

        streamer.start()

        print("Microphone started")
        print("Speak into the microphone.")
        print("Press Ctrl+C to stop.\n")

        try:
            for chunk in streamer.chunks():

                # Ignore non-speech.
                if not vad.is_speech(chunk):
                    continue

                # Add speech audio to the rolling window accumulator.
                windows = accumulator.push(chunk)

                for audio_window in windows:

                    window_id += 1

                    start_time = time.perf_counter()

                    # Extract the exact 30-D feature vector.
                    features = extract_features(audio_window)

                    if features.shape != (30,):
                        raise ValueError(
                            f"Expected 30-D feature vector, got {features.shape}"
                        )

                    # Calibrated XGBoost inference.
                    ai_probability = float(
                        model.predict_proba(
                            features.reshape(1, -1)
                        )[0, 1]
                    )

                    inference_latency_ms = (
                        time.perf_counter() - start_time
                    ) * 1000.0

                    prediction = ModelPrediction(
                        stream_id=STREAM_ID,
                        window_id=window_id,
                        timestamp=time.time(),
                        ai_probability=ai_probability,
                        model_version=MODEL_VERSION,
                    )

                    # Send ModelPrediction to the Risk Engine.
                    await websocket.send(
                        json.dumps(prediction.model_dump())
                    )

                    print(
                        f"window={window_id:<3} "
                        f"AI={ai_probability:.3f} "
                        f"features={features.shape} "
                        f"inference={inference_latency_ms:.2f}ms"
                    )

        finally:
            streamer.stop()
            accumulator.reset()

            print("\nMicrophone stopped")

    print("\n=== Live audio bridge stopped ===")


def main() -> None:
    asyncio.run(run_live_audio_bridge())


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped by user.")