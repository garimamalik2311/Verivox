import time
import numpy as np
from src.features import extract_features
from src.config import WINDOW_SIZE_SAMPLES

def test_feature_extraction_latency():
    dummy_audio = np.random.uniform(-1.0, 1.0, WINDOW_SIZE_SAMPLES).astype(np.float32)

    # Warmup runs to allow numba/librosa to compile internal filters
    for _ in range(15):
        _ = extract_features(dummy_audio)

    # Benchmark loop
    iterations = 100
    start = time.perf_counter()
    for _ in range(iterations):
        _ = extract_features(dummy_audio)
    avg_latency_ms = ((time.perf_counter() - start) / iterations) * 1000.0

    print(f"\nMean extraction latency: {avg_latency_ms:.2f} ms")
    # Calibrated to 15.0 ms to account for local WSL virtualization overhead
    assert avg_latency_ms < 15.0, f"Extraction exceeded local SLA of 15 ms: {avg_latency_ms:.2f} ms"

if __name__ == "__main__":
    test_feature_extraction_latency()