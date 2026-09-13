import json
import time

import joblib
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from src.features import extract_features
from src.risk_engine.schemas import ModelPrediction
from src.risk_engine.stream_manager import StreamManager
from src.vad import VoiceActivityDetector
from src.window_accumulator import WindowAccumulator


app = FastAPI()


# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------

MODEL_PATH = "reports/xgboost_calibrated.joblib"
MODEL_VERSION = "sprint2a-xgb-v1-calibrated"

model = joblib.load(MODEL_PATH)


# ---------------------------------------------------------------------------
# Audio configuration
# ---------------------------------------------------------------------------

AUDIO_SAMPLE_RATE = 16000

# WebRTC VAD supports 10, 20, or 30 ms frames.
# 20 ms at 16 kHz = 320 samples.
VAD_FRAME_SAMPLES = 320


# ---------------------------------------------------------------------------
# Shared Risk Engine state
# ---------------------------------------------------------------------------

stream_manager = StreamManager()


# Clients connected to /ws receive RiskResult broadcasts.
connected_clients: set[WebSocket] = set()


# ---------------------------------------------------------------------------
# Helper: broadcast RiskResult
# ---------------------------------------------------------------------------

async def broadcast_result(result) -> None:
    """
    Broadcast a RiskResult to every connected /ws dashboard client.

    Disconnected clients are removed from the shared client set.
    """

    disconnected_clients = set()

    for client in connected_clients:
        try:
            await client.send_json(result.model_dump())

        except Exception:
            disconnected_clients.add(client)

    connected_clients.difference_update(disconnected_clients)


# ---------------------------------------------------------------------------
# Existing ModelPrediction WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Receive ModelPrediction JSON messages.

    Flow:

    ModelPrediction
        -> Risk Engine
        -> RiskResult
        -> broadcast to connected dashboard clients
    """

    await websocket.accept()

    connected_clients.add(websocket)

    session_stream_ids = set()

    try:
        while True:

            raw_text = await websocket.receive_text()

            # ---------------------------------------------------------------
            # Parse JSON
            # ---------------------------------------------------------------

            try:
                data = json.loads(raw_text)

            except json.JSONDecodeError:
                await websocket.send_json(
                    {
                        "error": "Malformed JSON payload"
                    }
                )
                continue

            # ---------------------------------------------------------------
            # Validate ModelPrediction
            # ---------------------------------------------------------------

            try:
                prediction = ModelPrediction(**data)

            except ValidationError as e:
                await websocket.send_json(
                    {
                        "error": "Invalid prediction payload",
                        "details": e.errors(),
                    }
                )
                continue

            session_stream_ids.add(prediction.stream_id)

            # ---------------------------------------------------------------
            # Risk Engine
            # ---------------------------------------------------------------

            try:
                result = stream_manager.update(prediction)

            except ValueError as e:
                await websocket.send_json(
                    {
                        "error": "Risk Engine rejected prediction",
                        "details": str(e),
                    }
                )
                continue

            # ---------------------------------------------------------------
            # Broadcast RiskResult
            # ---------------------------------------------------------------

            await broadcast_result(result)

    except WebSocketDisconnect:
        print("Client disconnected")

    finally:
        connected_clients.discard(websocket)

        for stream_id in session_stream_ids:
            stream_manager.reset_stream(stream_id)


# ---------------------------------------------------------------------------
# Live audio WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/audio")
async def audio_websocket_endpoint(websocket: WebSocket):
    """
    Receive live microphone audio as PCM16 mono 16 kHz bytes.

    Flow:

    Browser microphone
        -> PCM16 audio
        -> VAD
        -> speech windows
        -> 30-D features
        -> calibrated XGBoost
        -> ModelPrediction
        -> Risk Engine
        -> RiskResult
        -> dashboard broadcast
    """

    await websocket.accept()

    stream_id = websocket.query_params.get(
        "stream_id",
        "browser_mic_001",
    )

    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()

    window_id = 0

    print(
        f"[audio] Client connected: "
        f"stream_id={stream_id}"
    )

    try:
        while True:

            message = await websocket.receive()

            # ---------------------------------------------------------------
            # Handle WebSocket disconnect cleanly
            # ---------------------------------------------------------------

            if message.get("type") == "websocket.disconnect":
                print(
                    f"[audio] Client disconnected: "
                    f"stream_id={stream_id}"
                )
                break

            # ---------------------------------------------------------------
            # Browser must send binary audio frames
            # ---------------------------------------------------------------

            if "bytes" not in message:

                if message.get("text") is not None:
                    await websocket.send_json(
                        {
                            "error": (
                                "Expected binary PCM16 audio data"
                            )
                        }
                    )

                continue

            audio_bytes = message["bytes"]

            if not audio_bytes:
                continue

            # ---------------------------------------------------------------
            # PCM16 -> float32
            # ---------------------------------------------------------------

            audio = (
                np.frombuffer(
                    audio_bytes,
                    dtype=np.int16,
                )
                .astype(np.float32)
                / 32768.0
            )

            # ---------------------------------------------------------------
            # VAD processing
            # ---------------------------------------------------------------

            for start in range(
                0,
                len(audio) - VAD_FRAME_SAMPLES + 1,
                VAD_FRAME_SAMPLES,
            ):

                frame = audio[
                    start:start + VAD_FRAME_SAMPLES
                ]

                # Ignore non-speech.
                if not vad.is_speech(frame):
                    continue

                # -----------------------------------------------------------
                # Window accumulation
                # -----------------------------------------------------------

                windows = accumulator.push(frame)

                for audio_window in windows:

                    window_id += 1

                    # -------------------------------------------------------
                    # Feature extraction + model inference
                    # -------------------------------------------------------

                    start_time = time.perf_counter()

                    features = extract_features(
                        audio_window
                    )

                    if features.shape != (30,):
                        raise ValueError(
                            "Expected 30-D feature vector, "
                            f"got {features.shape}"
                        )

                    ai_probability = float(
                        model.predict_proba(
                            features.reshape(1, -1)
                        )[0, 1]
                    )

                    inference_latency_ms = (
                        time.perf_counter()
                        - start_time
                    ) * 1000.0

                    # -------------------------------------------------------
                    # Create canonical ModelPrediction
                    # -------------------------------------------------------

                    prediction = ModelPrediction(
                        stream_id=stream_id,
                        window_id=window_id,
                        timestamp=time.time(),
                        ai_probability=ai_probability,
                        model_version=MODEL_VERSION,
                    )

                    # -------------------------------------------------------
                    # Risk Engine
                    # -------------------------------------------------------

                    result = stream_manager.update(
                        prediction
                    )

                    # -------------------------------------------------------
                    # Backend telemetry
                    # -------------------------------------------------------

                    print(
                        f"[audio] "
                        f"stream={stream_id} "
                        f"window={window_id} "
                        f"AI={ai_probability:.3f} "
                        f"rolling={result.rolling_score:.3f} "
                        f"flags={result.consecutive_flags} "
                        f"risk={result.risk_level.value} "
                        f"alert={result.alert_triggered} "
                        f"inference={inference_latency_ms:.2f}ms"
                    )

                    # -------------------------------------------------------
                    # Send RiskResult back to the audio client
                    # ---------------------------------------------------------------

                    await websocket.send_json(
                        result.model_dump()
                    )

                    # ---------------------------------------------------------------
                    # Broadcast RiskResult to dashboard clients
                    # ---------------------------------------------------------------

                    await broadcast_result(result)

    except WebSocketDisconnect:
        print(
            f"[audio] Client disconnected: "
            f"stream_id={stream_id}"
        )

    except Exception as exc:
        print(
            f"[audio] Error for "
            f"stream_id={stream_id}: {exc}"
        )

    finally:
        accumulator.reset()

        stream_manager.reset_stream(
            stream_id
        )

        print(
            f"[audio] Stream reset: "
            f"stream_id={stream_id}"
        )