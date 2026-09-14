import asyncio
import json
import time

import joblib
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from src.config import VAD_FRAME_SAMPLES
from src.features import extract_features
from src.risk_engine.schemas import ModelPrediction
from src.risk_engine.stream_manager import StreamManager
from src.vad import VoiceActivityDetector
from src.window_accumulator import WindowAccumulator

# --- Added by Person A (Sprint 1B) ---
from src.risk_engine.prosody_buffer import ProsodyBuffer
from src.risk_engine.shap_engine import ShapEngine
from src.speaker_registry import (
    SpeakerRegistry,
    UnknownSpeakerError,
    parse_speaker_id_from_query,
)
from src.speaker_verifier import SpeakerVerifier


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

MODEL_PATH = "reports/xgboost_58d_calibrated.joblib"
MODEL_VERSION = "sprint2b-xgb-58d-calibrated"

model = joblib.load(MODEL_PATH)

# --- Added by Person A (Sprint 1B) ---
# End-to-end SLA ceiling for this stage of the pipeline: feature
# extraction + model inference, measured inside process_audio_window().
# NOTE (scope limitation, flagged for the team): this does NOT include
# VAD or window-accumulation time upstream — only the model-facing part
# of the pipeline. If a true full end-to-end SLA is needed, timing needs
# to start earlier, at the top of the per-frame loop below.
E2E_SLA_MS = 15.0

shap_engine = ShapEngine()
speaker_registry = SpeakerRegistry()
speaker_verifier = SpeakerVerifier()

# --- Added by Person A (Sprint 1B) ---
# One ProsodyBuffer per active stream, mirroring the existing
# StreamManager pattern (one RiskEngine per stream_id).
prosody_buffers: dict[str, ProsodyBuffer] = {}


def get_prosody_buffer(stream_id: str) -> ProsodyBuffer:
    if stream_id not in prosody_buffers:
        prosody_buffers[stream_id] = ProsodyBuffer()
    return prosody_buffers[stream_id]


# ---------------------------------------------------------------------------
# Shared Risk Engine state
# ---------------------------------------------------------------------------

stream_manager = StreamManager()


# Clients connected to /ws receive RiskResult messages for the
# stream IDs associated with their connection.
connected_clients: set[WebSocket] = set()

client_stream_ids: dict[WebSocket, set[str]] = {}

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
        # --- Added by Person A (Sprint 1B): clean up prosody state too ---
        prosody_buffers.pop(stream_id, None)
    else:
        stream_owners[stream_id] = owners - 1


# ---------------------------------------------------------------------------
# Helper: broadcast RiskResult
# ---------------------------------------------------------------------------

async def broadcast_result(result, exclude: WebSocket | None = None) -> None:
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
# Existing ModelPrediction WebSocket (unchanged)
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    connected_clients.add(websocket)
    client_stream_ids[websocket] = set()

    session_stream_ids = set()

    try:
        while True:

            raw_text = await websocket.receive_text()

            try:
                data = json.loads(raw_text)

            except json.JSONDecodeError:
                await websocket.send_json(
                    {"error": "Malformed JSON payload"}
                )
                continue

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

            stream_id = prediction.stream_id

            if stream_id not in session_stream_ids:
                session_stream_ids.add(stream_id)
                client_stream_ids[websocket].add(stream_id)
                acquire_stream(stream_id)

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
            -> 58-D features
            -> calibrated XGBoost
            -> ModelPrediction
            -> Risk Engine
            -> RiskResult
                + prosody variance (Feature 1)      <- Added Sprint 1B
                + speaker verification (Feature 2)  <- Added Sprint 1B
                + vocoder flag / SHAP cues (3 & 4)  <- Added Sprint 1B
            -> dashboard broadcast
    """

    await websocket.accept()

    stream_id = websocket.query_params.get(
        "stream_id",
        "browser_mic_001",
    )
    # --- Added by Person A (Sprint 1B): optional speaker verification ---
    speaker_id = parse_speaker_id_from_query(websocket)

    acquire_stream(stream_id)
    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()
    prosody_buffer = get_prosody_buffer(stream_id)

    window_id = 0
    audio_remainder = np.empty(0, dtype=np.float32)

    print(
        f"[audio] Client connected: "
        f"stream_id={stream_id} speaker_id={speaker_id}"
    )

    try:
        while True:

            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                print(
                    f"[audio] Client disconnected: "
                    f"stream_id={stream_id}"
                )
                break

            if "bytes" not in message:

                if message.get("text") is not None:
                    await websocket.send_json(
                        {"error": "Expected binary PCM16 audio data"}
                    )

                continue

            audio_bytes = message["bytes"]

            if not audio_bytes:
                continue

            audio = (
                np.frombuffer(audio_bytes, dtype=np.int16)
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

            for start in range(0, complete_samples, VAD_FRAME_SAMPLES):

                frame = audio[start:start + VAD_FRAME_SAMPLES]

                if not vad.is_speech(frame):
                    continue

                windows = accumulator.push(frame)

                for audio_window in windows:

                    window_id += 1
                    window_timestamp = time.time()

                    # ---------------------------------------------------
                    # Feature extraction + model inference
                    # ---------------------------------------------------

                    ai_probability, latency_ms, features = await asyncio.to_thread(
                        process_audio_window,
                        audio_window,
                    )

                    sla_breach = latency_ms > E2E_SLA_MS
                    if sla_breach:
                        print(
                            f"[audio] SLA BREACH stream={stream_id} "
                            f"window={window_id} latency={latency_ms:.2f}ms "
                            f"(ceiling={E2E_SLA_MS}ms)"
                        )

                    # ---------------------------------------------------
                    # Feature 1: Prosody
                    # ---------------------------------------------------

                    prosody_buffer.push(features, window_timestamp)
                    pitch_variance = prosody_buffer.pitch_variance()
                    timing_variance = prosody_buffer.timing_variance()
                    flat_prosody = bool(prosody_buffer.is_flat_prosody())

                    # ---------------------------------------------------
                    # Feature 2: Speaker Verification (optional per-call)
                    # ---------------------------------------------------

                    speaker_similarity = None
                    speaker_match = None
                    if speaker_id is not None:
                        live_embedding = speaker_verifier.extract_embedding(
                            audio_window
                        )
                        if speaker_registry.is_enrolled(speaker_id):
                            try:
                                speaker_similarity = speaker_registry.verify(
                                    speaker_id, live_embedding
                                )
                                speaker_match = speaker_registry.is_match(
                                    speaker_id, live_embedding
                                )
                            except UnknownSpeakerError:
                                pass
                        else:
                            # First time we see this speaker_id on a live
                            # call: auto-enroll from this window. Replace
                            # with an explicit enrollment endpoint before
                            # production use — this is a Sprint 1B stopgap.
                            speaker_registry.enroll(speaker_id, live_embedding)

                    # ---------------------------------------------------
                    # Features 3 & 4: Vocoder + SHAP
                    # ---------------------------------------------------

                    shap_result = shap_engine.explain(features)

                    # ---------------------------------------------------
                    # Canonical ModelPrediction -> Risk Engine
                    # ---------------------------------------------------

                    prediction = ModelPrediction(
                        stream_id=stream_id,
                        window_id=window_id,
                        timestamp=window_timestamp,
                        ai_probability=ai_probability,
                        model_version=MODEL_VERSION,
                    )

                    result = stream_manager.update(prediction)

                    # --- Added by Person A (Sprint 1B): attach new fields ---
                    result = result.model_copy(update={
                        "prosody_pitch_variance": pitch_variance,
                        "prosody_timing_variance": timing_variance,
                        "flat_prosody_flag": flat_prosody,
                        "speaker_id": speaker_id,
                        "speaker_similarity": speaker_similarity,
                        "speaker_match": speaker_match,
                        "vocoder_flag": shap_result["vocoder_flag"],
                        "diagnostic_cues": shap_result["diagnostic_cues"],
                        "shap_top_features": shap_result["shap_top_features"],
                        "latency_ms": latency_ms,
                        "sla_breach": sla_breach,
                    })

                    print(
                        f"[audio] "
                        f"stream={stream_id} "
                        f"window={window_id} "
                        f"AI={ai_probability:.3f} "
                        f"rolling={result.rolling_score:.3f} "
                        f"flags={result.consecutive_flags} "
                        f"risk={result.risk_level.value} "
                        f"alert={result.alert_triggered} "
                        f"cues={result.diagnostic_cues} "
                        f"inference={latency_ms:.2f}ms "
                        f"sla_breach={sla_breach}"
                    )

                    await websocket.send_json(result.model_dump())
                    await broadcast_result(result)

    except WebSocketDisconnect:
        print(f"[audio] Client disconnected: stream_id={stream_id}")

    except Exception as exc:
        print(f"[audio] Error for stream_id={stream_id}: {exc}")

    finally:
        accumulator.reset()
        prosody_buffer.reset()
        release_stream(stream_id)

        print(f"[audio] Stream reset: stream_id={stream_id}")


# ---------------------------------------------------------------------------
# Audio model inference
# ---------------------------------------------------------------------------

def process_audio_window(
    audio_window: np.ndarray,
) -> tuple[float, float, np.ndarray]:
    """
    Extract features and run the calibrated XGBoost model.

    Returns (ai_probability, latency_ms, features) — the raw 58-D
    feature vector is now also returned so it can be reused downstream
    for prosody tracking and SHAP explanation, instead of extracting
    features twice per window (which would blow the latency budget).
    """

    start_time = time.perf_counter()

    features = extract_features(audio_window)

    if features.shape != (58,):
        raise ValueError(
            f"Expected 58-D feature vector, got {features.shape}"
        )

    ai_probability = float(
        model.predict_proba(features.reshape(1, -1))[0, 1]
    )

    latency_ms = (time.perf_counter() - start_time) * 1000.0

    return ai_probability, latency_ms, features
