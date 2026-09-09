"""
mock_consumer.py
Stands in for Person B's real extract_features() function, which doesn't
exist yet. This lets you (Person A) prove your windows satisfy the
DATA CONTRACT end-to-end, without waiting for their code.

DATA CONTRACT (agreed with Person B):
  Each window must be:
    - dtype:  float32
    - shape:  (16000,)   i.e. exactly 1 second @ 16kHz
    - mono, sample rate 16kHz (implied by shape/dtype, not re-checked here)

Person B's real extract_features() will eventually take a window like this
and return a (30,) feature vector. This mock fakes that return value so
you can test the full pipeline shape without their code.
"""

import numpy as np

from config import SAMPLE_RATE, WINDOW_SIZE_SAMPLES


class ContractViolation(Exception):
    """Raised when a window doesn't match the agreed data contract."""
    pass


def validate_window(window: np.ndarray, window_index: int = 0):
    """
    Checks a single window against the DATA CONTRACT from the sprint plan.
    Raises ContractViolation with a clear message if anything doesn't match.
    """
    if not isinstance(window, np.ndarray):
        raise ContractViolation(
            f"[window #{window_index}] expected np.ndarray, got {type(window)}"
        )

    if window.dtype != np.float32:
        raise ContractViolation(
            f"[window #{window_index}] expected dtype float32, got {window.dtype}"
        )

    if window.shape != (WINDOW_SIZE_SAMPLES,):
        raise ContractViolation(
            f"[window #{window_index}] expected shape ({WINDOW_SIZE_SAMPLES},), "
            f"got {window.shape}"
        )

    if window.min() < -1.0001 or window.max() > 1.0001:
        raise ContractViolation(
            f"[window #{window_index}] values out of range [-1, 1]: "
            f"min={window.min():.3f}, max={window.max():.3f}"
        )


def mock_extract_features(window: np.ndarray, window_index: int = 0) -> np.ndarray:
    """
    Fake stand-in for Person B's extract_features(window) -> (30,) vector.
    Validates the contract first (this is the real point of this mock),
    then returns random values shaped like real features would be, so
    anything downstream that expects a (30,) vector can still be tested.
    """
    validate_window(window, window_index)

    # Person B's real function will compute 13 MFCCs + spectral features +
    # chroma here. We fake it with random values of the right shape.
    fake_features = np.random.randn(30).astype(np.float32)

    print(f"[MOCK] received window #{window_index} — "
          f"shape={window.shape}, dtype={window.dtype} ✓  "
          f"-> faked (30,) feature vector")

    return fake_features


def run_contract_test(filepath: str):
    """
    Full integration smoke test: runs YOUR real pipeline (file_loader ->
    vad -> window_accumulator) and feeds every resulting window through
    the mock consumer, exactly like Person B's real code eventually will.
    """
    from pipeline import process_file

    print(f"Running contract test on: {filepath}\n")
    windows = process_file(filepath)

    if not windows:
        print("No windows produced (audio may be too short or all silence).")
        return

    all_features = []
    for i, window in enumerate(windows):
        features = mock_extract_features(window, window_index=i)
        all_features.append(features)

    all_features = np.stack(all_features)
    print(f"\n✅ Contract test passed: {len(windows)} windows, "
          f"all validated, feature matrix shape = {all_features.shape}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        run_contract_test(sys.argv[1])
    else:
        print("Usage: python3 mock_consumer.py <audio_file>")