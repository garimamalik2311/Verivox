import time
import numpy as np
from src.features import extract_features
from src.config import WINDOW_SIZE_SAMPLES, TOTAL_FEATURES

def test_feature_extraction_latency():
    # 1. Generate 1.0 second dummy float32 audio array (16,000 samples @ 16 kHz)[cite: 2]
    dummy_audio = np.random.uniform(-1.0, 1.0, WINDOW_SIZE_SAMPLES).astype(np.float32)

    # 2. Warmup runs to allow numba/librosa/VAD to compile internal filters[cite: 4]
    for _ in range(15):
        vec = extract_features(dummy_audio)

    # Verification: Confirm vector returned matches 58-D layout
    assert vec.shape == (TOTAL_FEATURES,), f"Expected shape ({TOTAL_FEATURES},), got {vec.shape}"

    # 3. Benchmark loop over 100 iterations
    iterations = 100
    start = time.perf_counter()
    for _ in range(iterations):
        _ = extract_features(dummy_audio)
    avg_latency_ms = ((time.perf_counter() - start) / iterations) * 1000.0

    print(f"\n[DSP SLA Audit] Mean 58-D extraction latency: {avg_latency_ms:.2f} ms")
    
    # SLA Hard Ceiling: Must stay strictly < 5.0 ms
    assert avg_latency_ms < 5.0, f"SLA Violation! Feature extraction exceeded 5.0 ms ceiling: {avg_latency_ms:.2f} ms"

if __name__ == "__main__":
    test_feature_extraction_latency()