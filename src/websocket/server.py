import asyncio
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


@app.get("/health")
def health_check():
    """Return backend health and model information."""
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "active_streams": len(stream_manager.active_streams()),
    }


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


# Clients connected to /ws receive RiskResult messages for the
# stream IDs associated with their connection.
connected_clients: set[WebSocket] = set()

# Maps each /ws client to the stream IDs it has submitted.
#
# Example:
#
#     client_a -> {"pytest_high_stream_v4"}
#     client_b -> {"pytest_low_stream_v4"}
#
# This allows RiskResult messages to be routed only to clients
# associated with the corresponding stream.
client_stream_ids: dict[WebSocket, set[str]] = {}

# Number of active WebSocket connections using each stream ID.
stream_owners: dict[str, int] = {}

def acquire_stream(stream_id: str) -> None:
    """Register one active connection using a stream."""
    stream_owners[stream_id] = stream_owners.get(stream_id, 0) + 1


def release_stream(stream_id: str) -> None:
    """
    Release one connection's ownership of a stream.

    Remove the Risk Engine only when no active connection
    is still using that stream.
    """
    owners = stream_owners.get(stream_id, 0)

    if owners <= 1:
        stream_owners.pop(stream_id, None)
        stream_manager.remove_stream(stream_id)
    else:
        stream_owners[stream_id] = owners - 1


# ---------------------------------------------------------------------------
# Helper: broadcast RiskResult
# ---------------------------------------------------------------------------

async def broadcast_result(result, exclude: WebSocket | None = None) -> None:
    """
    Send a RiskResult only to /ws clients associated with the
    result's stream_id.

    This prevents results from one persistent stream leaking
    into another client's WebSocket connection.

    Disconnected clients are removed from the shared client set
    and stream mapping.
    """

    disconnected_clients: set[WebSocket] = set()

    result_stream_id = result.stream_id

    for client in connected_clients:
        if client is exclude:
            continue

        subscribed_streams = client_stream_ids.get(client, set())

        if result_stream_id not in subscribed_streams:
            continue

        try:
            await client.send_json(result.model_dump())

        except Exception:
            disconnected_clients.add(client)

    for client in disconnected_clients:
        connected_clients.discard(client)
        client_stream_ids.pop(client, None)


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
            -> route only to clients subscribed to that stream
    """

    await websocket.accept()

    connected_clients.add(websocket)
    client_stream_ids[websocket] = set()

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

            # Register this stream against this WebSocket.
            #
            # A single WebSocket may submit predictions for multiple
            # stream IDs, so we maintain a set.
            stream_id = prediction.stream_id

            if stream_id not in session_stream_ids:
                session_stream_ids.add(stream_id)
                client_stream_ids[websocket].add(stream_id)
                acquire_stream(stream_id)

            # ---------------------------------------------------------------
            # Risk Engine
            # ---------------------------------------------------------------

            try:
                result = stream_manager.update(prediction)

                print(
                    f"[ws] stream={prediction.stream_id} "
                    f"window={prediction.window_id} "
                    f"prob={prediction.ai_probability:.2f} "
                    f"rolling={result.rolling_score:.2f} "
                    f"flags={result.consecutive_flags} "
                    f"risk={result.risk_level.value} "
                    f"alert={result.alert_triggered}"
                )

            except ValueError as e:
                await websocket.send_json(
                    {
                        "error": "Risk Engine rejected prediction",
                        "details": str(e),
                    }
                )
                continue

            # ---------------------------------------------------------------
            # Route RiskResult
            # ---------------------------------------------------------------

            # Send directly to the originating client.
            #
            # This guarantees that the client immediately receives
            # the result for the prediction it submitted.
            await websocket.send_json(result.model_dump())
            await broadcast_result(result, exclude=websocket)

    except WebSocketDisconnect:
        print("Client disconnected")

    finally:
        connected_clients.discard(websocket)
        client_stream_ids.pop(websocket, None)

        for stream_id in session_stream_ids:
            release_stream(stream_id)


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

    acquire_stream(stream_id)
    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()

    window_id = 0
    audio_remainder = np.empty(0, dtype=np.float32)

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
            audio = np.concatenate((audio_remainder, audio))
            complete_samples = (
                len(audio) // VAD_FRAME_SAMPLES
            ) * VAD_FRAME_SAMPLES

            if complete_samples == 0:
                audio_remainder = audio
                continue

            audio_remainder = audio[complete_samples:]

            # ---------------------------------------------------------------
            # VAD processing
            # ---------------------------------------------------------------

            for start in range(
                0,
                complete_samples,
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

                    ai_probability, latency_ms = await asyncio.to_thread(
                        process_audio_window,
                        audio_window,
                    )

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
                        f"inference={latency_ms:.2f}ms"
                    )

                    # -------------------------------------------------------
                    # Send RiskResult back to the audio client
                    # -------------------------------------------------------

                    await websocket.send_json(
                        result.model_dump()
                    )

                    # -------------------------------------------------------
                    # Broadcast RiskResult to dashboard clients
                    # -------------------------------------------------------

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

        release_stream(stream_id)

        print(
            f"[audio] Stream reset: "
            f"stream_id={stream_id}"
        )


# ---------------------------------------------------------------------------
# Audio model inference
# ---------------------------------------------------------------------------

def process_audio_window(
    audio_window: np.ndarray,
) -> tuple[float, float]:
    """
    Extract features and run the calibrated XGBoost model.

    This function is intentionally synchronous because it is executed
    inside asyncio.to_thread() from the WebSocket handler.
    """

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

    return ai_probability, latency_ms