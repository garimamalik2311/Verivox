import asyncio
import time
import numpy as np
import joblib

from src.features import extract_features
from src.risk_engine.shap_engine import ShapEngine
from src.risk_engine.stream_manager import StreamManager
from src.risk_engine.schemas import ModelPrediction
from src.risk_engine.prosody_buffer import ProsodyBuffer

def test_full_pipeline_e2e_latency():
    print("=" * 60)
    print("RUNNING END-TO-END PIPELINE LATENCY AUDIT")
    print("=" * 60)

    # 1. Load pipeline artifacts
    model = joblib.load("reports/xgboost_58d_calibrated.joblib")
    shap_engine = ShapEngine()
    stream_manager = StreamManager()
    prosody_buffer = ProsodyBuffer()
    stream_id = "latency_test_stream"

    # 2. Generate dummy PCM16 audio bytes (1.0 second = 16,000 samples @ 16 kHz)
    raw_pcm16_bytes = np.random.randint(-32768, 32767, 16000, dtype=np.int16).tobytes()

    # Warmup runs (for Numba/SHAP compilation)
    for _ in range(5):
        audio_float = np.frombuffer(raw_pcm16_bytes, dtype="<i2").astype(np.float32) / 32768.0
        features = extract_features(audio_float)
        _ = model.predict_proba(features.reshape(1, -1))
        _ = shap_engine.explain(features)

    # 3. Benchmark Loop
    iterations = 100
    total_times = []
    dsp_times = []
    ml_times = []
    shap_times = []
    risk_times = []

    for i in range(iterations):
        t_start = time.perf_counter()

        # Step A: PCM16 Decode & Normalization
        audio_float = np.frombuffer(raw_pcm16_bytes, dtype="<i2").astype(np.float32) / 32768.0

        # Step B: 58-D DSP Feature Extraction
        t_dsp = time.perf_counter()
        features = extract_features(audio_float)
        dsp_times.append((time.perf_counter() - t_dsp) * 1000.0)

        # Step C: Calibrated XGBoost Inference
        t_ml = time.perf_counter()
        prob_array = model.predict_proba(features.reshape(1, -1))
        ai_prob = float(prob_array[0, 1])
        ml_times.append((time.perf_counter() - t_ml) * 1000.0)

        # Step D: TreeSHAP Diagnostic Tagging (Selective execution)
        t_shap = time.perf_counter()
        if ai_prob >= 0.50:
            _ = shap_engine.explain(features)
        shap_times.append((time.perf_counter() - t_shap) * 1000.0)

        # Step E: Rolling Risk Engine & Prosody State Update
        t_risk = time.perf_counter()
        prosody_buffer.push(features, time.time())
        prediction = ModelPrediction(
            stream_id=stream_id,
            window_id=i + 1,
            timestamp=time.time(),
            ai_probability=ai_prob,
            model_version="sprint2b-xgb-58d-calibrated"
        )
        _ = stream_manager.update(prediction)
        risk_times.append((time.perf_counter() - t_risk) * 1000.0)

        t_end = time.perf_counter()
        total_times.append((t_end - t_start) * 1000.0)

    # 4. Print Summary
    avg_dsp = np.mean(dsp_times)
    avg_ml = np.mean(ml_times)
    avg_shap = np.mean(shap_times)
    avg_risk = np.mean(risk_times)
    avg_total = np.mean(total_times)

    print(f"1. PCM Decode & DSP Extraction : {avg_dsp:.2f} ms")
    print(f"2. XGBoost Model Inference     : {avg_ml:.2f} ms")
    print(f"3. TreeSHAP Tagging            : {avg_shap:.2f} ms")
    print(f"4. Rolling Risk Engine State   : {avg_risk:.2f} ms")
    print("-" * 60)
    print(f"TOTAL END-TO-END LATENCY      : {avg_total:.2f} ms")
    print("=" * 60)

    # SLA Audits
    if avg_dsp < 5.0 and avg_total < 15.0:
        print(" SUCCESS: E2E Pipeline meets the < 15.0 ms SLA ceiling! ")
    else:
        print(" WARNING: Pipeline latency exceeded SLA targets! ")

if __name__ == "__main__":
    test_full_pipeline_e2e_latency()