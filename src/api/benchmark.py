"""
Sprint 2b - Step 7: Latency benchmark.

Measures how fast the calibrated model scores a single window,
to confirm it meets VeriVox's real-time constraint (Sprint 1's VAD
was 2.96ms - the model should be in a similar ballpark, or at least
well under 100ms).
"""

import time
import joblib
import numpy as np

model = joblib.load("reports/xgboost_calibrated.joblib")
X_val = np.load("data/processed/X_val.npy")

# Warm up - the first few calls are often slower (caching, JIT-like effects)
for _ in range(10):
    idx = np.random.randint(len(X_val))
    model.predict_proba(X_val[idx:idx+1])

# Measure 1000 single-window predictions
times = []
for _ in range(1000):
    idx = np.random.randint(len(X_val))
    x = X_val[idx:idx+1]
    t0 = time.perf_counter()
    model.predict_proba(x)
    times.append(time.perf_counter() - t0)

times = np.array(times) * 1000  # convert seconds to milliseconds

results = (
    f"Latency benchmark (calibrated model, {len(times)} single-window predictions)\n"
    f"p50: {np.percentile(times, 50):.3f} ms\n"
    f"p95: {np.percentile(times, 95):.3f} ms\n"
    f"p99: {np.percentile(times, 99):.3f} ms\n"
    f"mean: {times.mean():.3f} ms\n"
    f"\nFor comparison, Sprint 1's VAD stage measured 2.96 ms.\n"
)

print(results)

with open("reports/latency_benchmark.txt", "w") as f:
    f.write(results)

print("Saved reports/latency_benchmark.txt")