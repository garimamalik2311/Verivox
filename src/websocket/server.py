import asyncio
import json
import time

import joblib
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from src.adversarial.router import router as adversarial_router
from src.config import VAD_FRAME_SAMPLES, SAMPLE_RATE
from src.features import extract_features
from src.yin_analyzer import extract_yin_pitch_stats
from src.risk_engine.schemas import ModelPrediction
from src.risk_engine.stream_manager import StreamManager
from src.vad import VoiceActivityDetector
from src.window_accumulator import WindowAccumulator

# --- Sprint 1B additions ---
from src.risk_engine.prosody_buffer import ProsodyBuffer
from src.risk_engine.shap_engine import ShapEngine
from src.risk_engine.notification_engine import NotificationEngine
from src.speaker_registry import (
    SpeakerRegistry,
    UnknownSpeakerError,
    parse_speaker_id_from_query,
)
from src.speaker_verifier import SpeakerVerifier


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(adversarial_router)



# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

MODEL_PATH = "reports/xgboost_58d_calibrated.joblib"
MODEL_VERSION = "sprint2b-xgb-58d-calibrated"
EXPECTED_FEATURES = 58

model = joblib.load(MODEL_PATH)

# Feature extraction + model inference SLA.
# This does NOT include VAD or window accumulation time.
E2E_SLA_MS = 15.0

shap_engine = ShapEngine()
notification_engine = NotificationEngine()
speaker_registry = SpeakerRegistry()
speaker_verifier = SpeakerVerifier()

# One ProsodyBuffer per active stream.
prosody_buffers: dict[str, ProsodyBuffer] = {}


def get_prosody_buffer(stream_id: str) -> ProsodyBuffer:
    if stream_id not in prosody_buffers:
        prosody_buffers[stream_id] = ProsodyBuffer()

    return prosody_buffers[stream_id]


# ============================================================================
# MODEL VALIDATION / STARTUP LOGGING
# ============================================================================

print("=" * 70)
print("[model] Loaded:", MODEL_PATH)
print("[model] Version:", MODEL_VERSION)
print("[model] Type:", type(model).__name__)

if hasattr(model, "n_features_in_"):
    print("[model] Expected features:", model.n_features_in_)

if hasattr(model, "named_steps"):
    print("[model] Pipeline steps:", list(model.named_steps.keys()))

print("=" * 70)


# ============================================================================
# SHARED RISK ENGINE STATE
# ============================================================================

stream_manager = StreamManager()

connected_clients: set[WebSocket] = set()

client_stream_ids: dict[WebSocket, set[str]] = {}

stream_owners: dict[str, int] = {}


def acquire_stream(stream_id: str) -> None:
    """Register one active connection using a stream."""

    stream_owners[stream_id] = stream_owners.get(stream_id, 0) + 1


def release_stream(stream_id: str) -> None:
    """
    Release one connection's ownership of a stream.

    Remove the Risk Engine stream only when no active
    connection is still using that stream.
    """

    owners = stream_owners.get(stream_id, 0)

    if owners <= 1:
        stream_owners.pop(stream_id, None)

        try:
            stream_manager.remove_stream(stream_id)
        except Exception as exc:
            print(
                f"[risk] Failed to remove stream "
                f"{stream_id}: {exc}"
            )

        # Clean up prosody state too.
        prosody_buffers.pop(stream_id, None)

    else:
        stream_owners[stream_id] = owners - 1


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
def health_check():
    """Return backend health and model information."""

    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "active_streams": len(stream_manager.active_streams()),
        "expected_features": EXPECTED_FEATURES,
        "vad_frame_samples": VAD_FRAME_SAMPLES,
    }


# ============================================================================
# BROADCAST RISK RESULT
# ============================================================================

async def broadcast_result(
    result,
    exclude: WebSocket | None = None,
) -> None:
    """
    Send RiskResult only to clients associated with
    the result's stream_id.
    """

    disconnected_clients: set[WebSocket] = set()

    result_stream_id = result.stream_id

    for client in list(connected_clients):

        if client is exclude:
            continue

        subscribed_streams = client_stream_ids.get(
            client,
            set(),
        )

        if result_stream_id not in subscribed_streams:
            continue

        try:
            await client.send_json(
                result.model_dump()
            )

        except Exception:
            disconnected_clients.add(client)

    for client in disconnected_clients:
        connected_clients.discard(client)
        client_stream_ids.pop(client, None)


# ============================================================================
# STANDARD MODEL-PREDICTION WEBSOCKET
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
):
    """
    Receive ModelPrediction JSON messages.

    Flow:

        ModelPrediction
            ↓
        Risk Engine
            ↓
        RiskResult
            ↓
        subscribed clients
    """

    await websocket.accept()

    connected_clients.add(websocket)
    client_stream_ids[websocket] = set()

    session_stream_ids = set()

    try:

        while True:

            raw_text = await websocket.receive_text()

            # ----------------------------------------------------------------
            # Parse JSON
            # ----------------------------------------------------------------

            try:
                data = json.loads(raw_text)

            except json.JSONDecodeError:

                await websocket.send_json(
                    {"error": "Malformed JSON payload"}
                )

                continue

            # ----------------------------------------------------------------
            # Validate ModelPrediction
            # ----------------------------------------------------------------

            try:
                prediction = ModelPrediction(**data)

            except ValidationError as exc:

                await websocket.send_json(
                    {
                        "error": "Invalid prediction payload",
                        "details": exc.errors(),
                    }
                )

                continue

            stream_id = prediction.stream_id

            # ----------------------------------------------------------------
            # Register stream
            # ----------------------------------------------------------------

            if stream_id not in session_stream_ids:

                session_stream_ids.add(stream_id)

                client_stream_ids[
                    websocket
                ].add(stream_id)

                acquire_stream(stream_id)

            # ----------------------------------------------------------------
            # Risk Engine
            # ----------------------------------------------------------------

            try:

                result = stream_manager.update(
                    prediction
                )

                print(
                    f"[ws] "
                    f"stream={prediction.stream_id} "
                    f"window={prediction.window_id} "
                    f"prob={prediction.ai_probability:.3f} "
                    f"rolling={result.rolling_score:.3f} "
                    f"flags={result.consecutive_flags} "
                    f"risk={result.risk_level.value} "
                    f"alert={result.alert_triggered}"
                )

            except ValueError as exc:

                await websocket.send_json(
                    {
                        "error": (
                            "Risk Engine rejected "
                            "prediction"
                        ),
                        "details": str(exc),
                    }
                )

                continue

            # ----------------------------------------------------------------
            # Send result to originating client
            # ----------------------------------------------------------------

            await websocket.send_json(
                result.model_dump()
            )

            # ----------------------------------------------------------------
            # Broadcast result
            # ----------------------------------------------------------------

            await broadcast_result(
                result,
                exclude=websocket,
            )

    except WebSocketDisconnect:

        print("[ws] Client disconnected")

    except Exception as exc:

        print(
            f"[ws] Unexpected error: {exc}"
        )

    finally:

        connected_clients.discard(websocket)

        client_stream_ids.pop(
            websocket,
            None,
        )

        for stream_id in session_stream_ids:

            release_stream(stream_id)


# ============================================================================
# PCM16 DECODER
# ============================================================================

def decode_pcm16(
    audio_bytes: bytes,
) -> np.ndarray:
    """
    Convert little-endian PCM16 bytes into float32
    samples in the range [-1, 1].
    """

    if not audio_bytes:
        return np.empty(
            0,
            dtype=np.float32,
        )

    # PCM16 must contain an even number of bytes.
    if len(audio_bytes) % 2 != 0:
        raise ValueError(
            "PCM16 payload contains an odd "
            "number of bytes"
        )

    audio = np.frombuffer(
        audio_bytes,
        dtype="<i2",
    ).astype(
        np.float32
    )

    audio /= 32768.0

    return audio


# ============================================================================
# FEATURE VALIDATION
# ============================================================================

def validate_features(
    features: np.ndarray,
) -> np.ndarray:
    """
    Validate and normalize the feature vector before
    sending it to the model.
    """

    features = np.asarray(
        features,
        dtype=np.float32,
    )

    # Flatten possible (1, 58) / (58, 1) outputs.
    features = features.reshape(-1)

    # Exact dimensionality check.
    if features.shape != (
        EXPECTED_FEATURES,
    ):
        raise ValueError(
            "Invalid feature dimension: "
            f"expected {EXPECTED_FEATURES}, "
            f"got {features.shape}"
        )

    # NaN / Inf protection.
    if not np.all(
        np.isfinite(features)
    ):
        raise ValueError(
            "Feature vector contains "
            "NaN or Inf values"
        )

    return features


# ============================================================================
# MODEL INFERENCE
# ============================================================================

def process_audio_window(
    audio_window: np.ndarray,
) -> tuple[float, float, np.ndarray]:
    """
    Extract the 58-D feature vector and run
    the calibrated XGBoost model.

    Returns:

        ai_probability
        latency_ms
        features

    The feature vector is returned so that prosody and
    SHAP processing can reuse it without extracting
    features a second time.
    """

    start_time = time.perf_counter()

    # ------------------------------------------------------------------------
    # Validate audio window
    # ------------------------------------------------------------------------

    audio_window = np.asarray(
        audio_window,
        dtype=np.float32,
    ).reshape(-1)

    if len(audio_window) == 0:
        raise ValueError(
            "Received empty audio window"
        )

    if not np.all(
        np.isfinite(audio_window)
    ):
        raise ValueError(
            "Audio window contains NaN or Inf"
        )

    # ------------------------------------------------------------------------
    # Basic audio diagnostics
    # ------------------------------------------------------------------------

    audio_min = float(
        np.min(audio_window)
    )

    audio_max = float(
        np.max(audio_window)
    )

    audio_rms = float(
        np.sqrt(
            np.mean(
                np.square(audio_window)
            )
        )
    )

    print(
        f"[features] "
        f"samples={len(audio_window)} "
        f"min={audio_min:.4f} "
        f"max={audio_max:.4f} "
        f"rms={audio_rms:.5f}"
    )

    # ------------------------------------------------------------------------
    # Extract features ONCE
    # ------------------------------------------------------------------------

    raw_features = extract_features(
        audio_window
    )

    # ------------------------------------------------------------------------
    # Validate features
    # ------------------------------------------------------------------------

    features = validate_features(
        raw_features
    )

    # ------------------------------------------------------------------------
    # Feature diagnostics
    # ------------------------------------------------------------------------

    feature_min = float(
        np.min(features)
    )

    feature_max = float(
        np.max(features)
    )

    feature_mean = float(
        np.mean(features)
    )

    feature_std = float(
        np.std(features)
    )

    print(
        f"[features] "
        f"dim={features.shape[0]} "
        f"min={feature_min:.4f} "
        f"max={feature_max:.4f} "
        f"mean={feature_mean:.4f} "
        f"std={feature_std:.4f}"
    )

    # ------------------------------------------------------------------------
    # Check model dimensionality if available
    # ------------------------------------------------------------------------

    if hasattr(
        model,
        "n_features_in_",
    ):

        if model.n_features_in_ != (
            EXPECTED_FEATURES
        ):
            raise ValueError(
                "Model expects "
                f"{model.n_features_in_} features "
                f"but server expects "
                f"{EXPECTED_FEATURES}"
            )

    # ------------------------------------------------------------------------
    # Model inference
    #
    # If model is a Pipeline containing the scaler,
    # predict_proba() automatically applies it.
    # ------------------------------------------------------------------------

    probability_array = model.predict_proba(
        features.reshape(1, -1)
    )

    if probability_array.shape[1] < 2:
        raise ValueError(
            "Model does not provide binary "
            "class probabilities"
        )

    ai_probability = float(
        probability_array[0, 1]
    )

    # ------------------------------------------------------------------------
    # Probability safety
    # ------------------------------------------------------------------------

    if not np.isfinite(
        ai_probability
    ):
        raise ValueError(
            "Model returned NaN/Inf probability"
        )

    ai_probability = float(
        np.clip(
            ai_probability,
            0.0,
            1.0,
        )
    )

    latency_ms = (
        time.perf_counter()
        - start_time
    ) * 1000.0

    return (
        ai_probability,
        latency_ms,
        features,
    )


# ============================================================================
# LIVE AUDIO WEBSOCKET
# ============================================================================

@app.websocket("/ws/audio")
async def audio_websocket_endpoint(
    websocket: WebSocket,
):
    """
    Receive live microphone audio as PCM16 mono
    16 kHz bytes.

    Flow:

        Browser microphone
            ↓
        PCM16 audio
            ↓
        VAD
            ↓
        speech frames
            ↓
        WindowAccumulator
            ↓
        58-D features
            ↓
        calibrated XGBoost
            ↓
        ModelPrediction
            ↓
        Risk Engine
            ↓
        RiskResult
            ↓
        Prosody / speaker / SHAP diagnostics
            ↓
        Browser dashboard
    """

    await websocket.accept()

    stream_id = websocket.query_params.get(
        "stream_id",
        "browser_mic_001",
    )

    # Optional speaker verification.
    speaker_id = parse_speaker_id_from_query(
        websocket
    )

    scenario = websocket.query_params.get(
        "scenario",
        "routine_support",
    )

    acquire_stream(stream_id)

    vad = VoiceActivityDetector()

    accumulator = WindowAccumulator()

    prosody_buffer = get_prosody_buffer(
        stream_id
    )

    window_id = 0

    # Once a synthetic-voice alert is triggered, terminate
    # this audio stream and stop processing remaining audio.
    stream_terminated = False


    # Holds incomplete VAD frame samples between
    # WebSocket packets.
    audio_remainder = np.empty(
        0,
        dtype=np.float32,
    )

    print(
        f"[audio] Client connected: "
        f"stream_id={stream_id} "
        f"speaker_id={speaker_id}"
    )

    print(
        f"[audio] VAD_FRAME_SAMPLES="
        f"{VAD_FRAME_SAMPLES}"
    )

    try:

        while True:

            message = await websocket.receive()

            # ----------------------------------------------------------------
            # Disconnect
            # ----------------------------------------------------------------

            if (
                message.get("type")
                == "websocket.disconnect"
            ):

                print(
                    f"[audio] Client disconnected: "
                    f"stream_id={stream_id}"
                )

                break

            # ----------------------------------------------------------------
            # Binary audio only
            # ----------------------------------------------------------------

            if "bytes" not in message:

                if message.get("text") is not None:

                    await websocket.send_json(
                        {
                            "error": (
                                "Expected binary "
                                "PCM16 audio data"
                            )
                        }
                    )

                continue

            audio_bytes = message["bytes"]

            if not audio_bytes:
                continue

            # ----------------------------------------------------------------
            # PCM16 → float32
            # ----------------------------------------------------------------

            try:

                audio = decode_pcm16(
                    audio_bytes
                )

            except ValueError as exc:

                print(
                    f"[audio] PCM error: {exc}"
                )

                await websocket.send_json(
                    {
                        "error": str(exc)
                    }
                )

                continue

            # ----------------------------------------------------------------
            # Add previous incomplete samples
            # ----------------------------------------------------------------

            if len(audio_remainder) > 0:

                audio = np.concatenate(
                    (
                        audio_remainder,
                        audio,
                    )
                )

            # ----------------------------------------------------------------
            # Determine complete VAD frames
            # ----------------------------------------------------------------

            complete_samples = (
                len(audio)
                // VAD_FRAME_SAMPLES
            ) * VAD_FRAME_SAMPLES

            # Not enough samples for one VAD frame.
            if complete_samples == 0:

                audio_remainder = audio

                continue

            # Save incomplete samples for the next packet.
            audio_remainder = audio[
                complete_samples:
            ]

            # ----------------------------------------------------------------
            # Process complete VAD frames
            # ----------------------------------------------------------------

            for start in range(
                0,
                complete_samples,
                VAD_FRAME_SAMPLES,
            ):

                frame = audio[
                    start:
                    start + VAD_FRAME_SAMPLES
                ]

                # ------------------------------------------------------------
                # VAD
                # ------------------------------------------------------------

                speech = vad.is_speech(
                    frame
                )

                if not speech:
                    continue

                # ------------------------------------------------------------
                # Accumulate speech frame
                # ------------------------------------------------------------

                windows = accumulator.push(
                    frame
                )

                # ------------------------------------------------------------
                # Process completed windows
                # ------------------------------------------------------------

                for audio_window in windows:

                    # --------------------------------------------------------
                    # Skip completely silent windows
                    # --------------------------------------------------------

                    speech_detected = False

                    for vad_start in range(
                        0,
                        len(audio_window),
                        VAD_FRAME_SAMPLES,
                    ):

                        vad_frame = audio_window[
                            vad_start:
                            vad_start + VAD_FRAME_SAMPLES
                        ]

                        if len(vad_frame) != (
                            VAD_FRAME_SAMPLES
                        ):
                            continue

                        if vad.is_speech(
                            vad_frame
                        ):
                            speech_detected = True
                            break

                    if not speech_detected:

                        print(
                            f"[audio] stream={stream_id} "
                            f"silent window skipped"
                        )

                        continue

                    window_id += 1

                    window_timestamp = time.time()

                    # --------------------------------------------------------
                    # Validate audio window
                    # --------------------------------------------------------

                    audio_window = np.asarray(
                        audio_window,
                        dtype=np.float32,
                    ).reshape(-1)

                    print(
                        f"[audio-window] "
                        f"window={window_id} "
                        f"samples={len(audio_window)}"
                    )

                    # --------------------------------------------------------
                    # Feature extraction + model inference
                    #
                    # Runs in a worker thread so inference does not
                    # block the asyncio event loop.
                    # --------------------------------------------------------

                    try:

                        (
                            ai_probability,
                            latency_ms,
                            features,
                        ) = await asyncio.to_thread(
                            process_audio_window,
                            audio_window,
                        )

                    except Exception as exc:

                        print(
                            f"[audio] "
                            f"Inference failed "
                            f"for window={window_id}: "
                            f"{exc}"
                        )

                        continue

                    yin_analysis = await asyncio.to_thread(
                        extract_yin_pitch_stats,
                        audio_window,
                        sr=SAMPLE_RATE,
                    )

                    # --------------------------------------------------------
                    # SLA
                    # --------------------------------------------------------

                    sla_breach = (
                        latency_ms > E2E_SLA_MS
                    )

                    if sla_breach:

                        print(
                            f"[audio] SLA BREACH "
                            f"stream={stream_id} "
                            f"window={window_id} "
                            f"latency={latency_ms:.2f}ms "
                            f"(ceiling={E2E_SLA_MS}ms)"
                        )

                    # --------------------------------------------------------
                    # Feature 1: Prosody
                    # --------------------------------------------------------

                    prosody_buffer.push(
                        features,
                        window_timestamp,
                    )

                    pitch_variance = (
                        prosody_buffer.pitch_variance()
                    )

                    timing_variance = (
                        prosody_buffer.timing_variance()
                    )

                    flat_prosody = bool(
                        prosody_buffer.is_flat_prosody()
                    )

                    # --------------------------------------------------------
                    # Feature 2: Speaker Verification
                    # --------------------------------------------------------

                    speaker_similarity = None
                    speaker_match = None

                    if speaker_id is not None:

                        try:

                            live_embedding = (
                                speaker_verifier.extract_embedding(
                                    audio_window
                                )
                            )

                            if speaker_registry.is_enrolled(
                                speaker_id
                            ):

                                try:

                                    speaker_similarity = (
                                        speaker_registry.verify(
                                            speaker_id,
                                            live_embedding,
                                        )
                                    )

                                    speaker_match = (
                                        speaker_registry.is_match(
                                            speaker_id,
                                            live_embedding,
                                        )
                                    )

                                except UnknownSpeakerError:
                                    pass

                            else:

                                # Sprint 1B stopgap:
                                # auto-enroll first observed window.
                                speaker_registry.enroll(
                                    speaker_id,
                                    live_embedding,
                                )

                        except Exception as exc:

                            print(
                                f"[speaker] "
                                f"Verification failed "
                                f"for speaker={speaker_id}: "
                                f"{exc}"
                            )

                    # --------------------------------------------------------
                    # Features 3 & 4: Vocoder + SHAP
                    # --------------------------------------------------------

                    try:

                        # Run SHAP only for suspicious windows to preserve
                        # real-time latency. Normal windows skip SHAP.
                        shap_result = {
                            "vocoder_flag": False,
                            "diagnostic_cues": [],
                            "shap_top_features": [],
                            "shap_features": [],
                        }


                        if ai_probability >= 0.50:
                            shap_result = (
                                shap_engine.explain(
                                    features
                                )
                            )

                    except Exception as exc:

                        print(
                            f"[shap] "
                            f"Explanation failed "
                            f"for window={window_id}: "
                            f"{exc}"
                        )

                        shap_result = {
                            "vocoder_flag": False,
                            "diagnostic_cues": [],
                            "shap_top_features": [],
                            "shap_features": [],
                        }

                    # --------------------------------------------------------
                    # Canonical ModelPrediction
                    # --------------------------------------------------------

                    prediction = ModelPrediction(
                        stream_id=stream_id,
                        window_id=window_id,
                        timestamp=window_timestamp,
                        ai_probability=ai_probability,
                        model_version=MODEL_VERSION,
                    )

                    # --------------------------------------------------------
                    # Risk Engine
                    # --------------------------------------------------------

                    try:

                        result = (
                            stream_manager.update(
                                prediction
                            )
                        )

                    except ValueError as exc:

                        print(
                            f"[audio] "
                            f"Risk Engine rejected "
                            f"window={window_id}: "
                            f"{exc}"
                        )

                        continue

                    # --------------------------------------------------------
                    # SIH Notification & Response Layer
                    # --------------------------------------------------------

                    notification = notification_engine.evaluate(
                        scenario=scenario,
                        risk_score=result.rolling_score,
                        alert_triggered=result.alert_triggered,
                    )

                    # --------------------------------------------------------
                    # Attach Sprint 1B diagnostics + notification telemetry
                    # --------------------------------------------------------

                    yin_analysis = await asyncio.to_thread(
                        extract_yin_pitch_stats,
                        audio_window,
                        sr=SAMPLE_RATE,
                    )

                    result = result.model_copy(
                        update={
                            "yin_analysis": yin_analysis,
                            "prosody_pitch_variance": (
                                pitch_variance
                            ),
                            "prosody_timing_variance": (
                                timing_variance
                            ),
                            "flat_prosody_flag": (
                                flat_prosody
                            ),
                            "speaker_id": (
                                speaker_id
                            ),
                            "speaker_similarity": (
                                speaker_similarity
                            ),
                            "speaker_match": (
                                speaker_match
                            ),
                            "vocoder_flag": (
                                shap_result.get(
                                    "vocoder_flag"
                                )
                            ),
                            "yin_analysis": (
                                yin_analysis
                            ),
                            "diagnostic_cues": (
                                shap_result.get(
                                    "diagnostic_cues",
                                    [],
                                )
                            ),
                            "shap_top_features": (
                                shap_result.get(
                                    "shap_top_features",
                                    [],
                                )
                            ),
                            "shap_features": (
                                shap_result.get(
                                    "shap_features",
                                    [],
                                )
                            ),
                            "latency_ms": (
                                latency_ms
                            ),
                            "sla_breach": (
                                sla_breach
                            ),
                            "notification_scenario": (
                                notification.scenario
                            ),
                            "notification_triggered": (
                                notification.triggered
                            ),
                            "notification_severity": (
                                notification.severity
                            ),
                            "notification_title": (
                                notification.title
                            ),
                            "notification_message": (
                                notification.message
                            ),
                            "recommended_actions": (
                                notification.recommended_actions
                            ),
                            "dispatch_channels": (
                                notification.dispatch_channels
                            ),
                            "privacy_mode": (
                                notification.privacy_mode
                            ),
                        }
                    )

                    # --------------------------------------------------------
                    # Telemetry
                    # --------------------------------------------------------

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
                        f"sla_breach={sla_breach} "
                        f"notification={notification.triggered} "
                        f"scenario={notification.scenario}"
                    )

                    # --------------------------------------------------------
                    # Send result to browser
                    # --------------------------------------------------------

                    await websocket.send_json(
                        result.model_dump()
                    )

                    # --------------------------------------------------------
                    # Broadcast result to dashboard clients
                    # --------------------------------------------------------

                    await broadcast_result(
                        result
                    )

                    # --------------------------------------------------------
                    # HARD STOP after confirmed synthetic-voice alert
                    # --------------------------------------------------------
                    if result.alert_triggered:
                        print(
                            f"[audio] HARD STOP: "
                            f"synthetic voice alert triggered "
                            f"for stream={stream_id} "
                            f"window={window_id}"
                        )

                        stream_terminated = True
                        break

                # Stop processing additional VAD frames from this packet.
                if stream_terminated:
                    break

            # Stop receiving additional WebSocket packets.
            if stream_terminated:
                print(
                    f"[audio] TERMINATING stream={stream_id} "
                    f"after synthetic-voice alert"
                )
                break

    except WebSocketDisconnect:

        print(
            f"[audio] WebSocket disconnected: "
            f"stream_id={stream_id}"
        )

    except Exception as exc:

        print(
            f"[audio] Unexpected error for "
            f"stream_id={stream_id}: {exc}"
        )

    finally:

        accumulator.reset()

        prosody_buffer.reset()

        release_stream(stream_id)

        print(
            f"[audio] Stream reset: "
            f"stream_id={stream_id}"
        )
