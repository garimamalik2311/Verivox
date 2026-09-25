"""
Root conftest.py — runs before any test collection/imports.

Forces single-threaded execution for both XGBoost and PyTorch's shared
OpenMP runtime. Without this, running XGBoost/SHAP tests and the real
ECAPA-TDNN torch model in the same pytest session segfaults on macOS
(confirmed via crash report: OpenMP thread-barrier collision between
the two libraries' separate thread pools).
"""
import os
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
