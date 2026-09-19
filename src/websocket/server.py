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

from src.risk_engine.prosody_buffer import ProsodyBuffer
from src.risk_engine.shap_engine import ShapEngine
from src.speaker_registry import (
    SpeakerRegistry,
    UnknownSpeakerError,
    parse_speaker_id_from_query,
)
from src.speaker_verifier import SpeakerVerifier

app = FastAPI()

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# Pointing to calibrated 58D XGBoost model artifact
MODEL_PATH = "reports/xgboost_58d_calibrated.joblib"
MODEL_VERSION = "sprint2b-xgb-58d-calibrated"
EXPECTED_FEATURES = 58

model = joblib.load(MODEL_PATH)
E2E_SLA_MS = 15.0

shap_engine = ShapEngine()
speaker_registry = SpeakerRegistry()
speaker_verifier = SpeakerVerifier()

prosody_buffers: dict[str, ProsodyBuffer] = {}


def get_prosody_buffer(stream_id: str) -> ProsodyBuffer:
    if stream_id not in prosody_buffers:
        prosody_buffers[stream_id] = ProsodyBuffer()
    return prosody_buffers[stream_id]


stream_manager = StreamManager()
connected_clients: set[WebSocket] = set()
client_stream_ids: dict[WebSocket, set[str]] = {}
stream_owners: dict[str, int] = {}


def acquire_stream(stream_id: str) -> None:
    stream_owners[stream_id] = stream_owners.get(stream_id, 0) + 1


def release_stream(stream_id: str) -> None:
    owners = stream_owners.get(stream_id, 0)
    if owners <= 1:
        stream_owners.pop(stream_id, None)
        try:
            stream_manager.remove_stream(stream_id)
        except Exception as exc:
            print(f"[risk] Failed to remove stream {stream_id}: {exc}")
        prosody_buffers.pop(stream_id, None)
    else:
        stream_owners[stream_id] = owners - 1


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "active_streams": len(stream_manager.active_streams()),
        "expected_features": EXPECTED_FEATURES,
        "vad_frame_samples": VAD_FRAME_SAMPLES,
    }


def decode_pcm16(audio_bytes: bytes) -> np.ndarray:
    if not audio_bytes:
        return np.empty(0, dtype=np.float32)

    if len(audio_bytes) % 2 != 0:
        raise ValueError("PCM16 payload contains an odd number of bytes")

    audio = np.frombuffer(audio_bytes, dtype="<i2").astype(np.float32)
    # Explicit float32 scaling factor division
    audio /= 32768.0
    return audio


def validate_features(features: np.ndarray) -> np.ndarray:
    features = np.asarray(features, dtype=np.float32).reshape(-1)

    if features.shape != (EXPECTED_FEATURES,):
        raise ValueError(
            f"Invalid feature dimension: expected {EXPECTED_FEATURES}, got {features.shape}"
        )

    if not np.all(np.isfinite(features)):
        raise ValueError("Feature vector contains NaN or Inf values")

    return features


def process_audio_window(audio_window: np.ndarray) -> tuple[float, float, np.ndarray]:
    start_time = time.perf_counter()

    audio_window = np.asarray(audio_window, dtype=np.float32).reshape(-1)

    if len(audio_window) == 0:
        raise ValueError("Received empty audio window")

    raw_features = extract_features(audio_window)
    features = validate_features(raw_features)

    probability_array = model.predict_proba(features.reshape(1, -1))
    ai_probability = float(probability_array[0, 1])

    ai_probability = float(np.clip(ai_probability, 0.0, 1.0))
    latency_ms = (time.perf_counter() - start_time) * 1000.0

    return ai_probability, latency_ms, features


@app.websocket("/ws/audio")
async def audio_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    stream_id = websocket.query_params.get("stream_id", "browser_mic_001")
    speaker_id = parse_speaker_id_from_query(websocket)

    acquire_stream(stream_id)
    vad = VoiceActivityDetector()
    accumulator = WindowAccumulator()
    prosody_buffer = get_prosody_buffer(stream_id)

    window_id = 0
    stream_terminated = False
    audio_remainder = np.empty(0, dtype=np.float32)

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" not in message:
                continue

            audio_bytes = message["bytes"]
            if not audio_bytes:
                continue

            try:
                audio = decode_pcm16(audio_bytes)
            except ValueError as exc:
                await websocket.send_json({"error": str(exc)})
                continue

            if len(audio_remainder) > 0:
                audio = np.concatenate((audio_remainder, audio))

            complete_samples = (len(audio) // VAD_FRAME_SAMPLES) * VAD_FRAME_SAMPLES

            if complete_samples == 0:
                audio_remainder = audio
                continue

            audio_remainder = audio[complete_samples:]

            for start in range(0, complete_samples, VAD_FRAME_SAMPLES):
                frame = audio[start : start + VAD_FRAME_SAMPLES]

                if not vad.is_speech(frame):
                    continue

                windows = accumulator.push(frame)

                for audio_window in windows:
                    window_id += 1
                    window_timestamp = time.time()

                    # Safe async thread execution for window feature extraction
                    try:
                        ai_probability, latency_ms, features = await asyncio.to_thread(
                            process_audio_window, audio_window
                        )
                    except Exception as exc:
                        print(f"[audio] Inference skipped for window={window_id}: {exc}")
                        continue

                    sla_breach = latency_ms > E2E_SLA_MS

                    prosody_buffer.push(features, window_timestamp)
                    pitch_var = prosody_buffer.pitch_variance()
                    timing_var = prosody_buffer.timing_variance()
                    flat_prosody = bool(prosody_buffer.is_flat_prosody())

                    shap_result = {
                        "vocoder_flag": False,
                        "diagnostic_cues": [],
                        "shap_top_features": [],
                        "shap_features": [],
                    }

                    # Selective SHAP execution threshold (ai_probability >= 0.50)
                    if ai_probability >= 0.50:
                        try:
                            shap_result = shap_engine.explain(features)
                        except Exception:
                            pass

                    prediction = ModelPrediction(
                        stream_id=stream_id,
                        window_id=window_id,
                        timestamp=window_timestamp,
                        ai_probability=ai_probability,
                        model_version=MODEL_VERSION,
                    )

                    result = stream_manager.update(prediction)

                    result = result.model_copy(
                        update={
                            "prosody_pitch_variance": pitch_var,
                            "prosody_timing_variance": timing_var,
                            "flat_prosody_flag": flat_prosody,
                            "speaker_id": speaker_id,
                            "vocoder_flag": shap_result.get("vocoder_flag"),
                            "diagnostic_cues": shap_result.get("diagnostic_cues", []),
                            "shap_top_features": shap_result.get("shap_top_features", []),
                            "shap_features": shap_result.get("shap_features", []),
                            "latency_ms": latency_ms,
                            "sla_breach": sla_breach,
                        }
                    )

                    await websocket.send_json(result.model_dump())

                    if result.alert_triggered:
                        stream_terminated = True
                        break

                if stream_terminated:
                    break

            if stream_terminated:
                break

    except WebSocketDisconnect:
        pass
    finally:
        accumulator.reset()
        prosody_buffer.reset()
        release_stream(stream_id)