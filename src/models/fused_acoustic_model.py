"""
fused_acoustic_model.py — Standalone Dual-Stream Neural Acoustic Inference Engine.

Fuses:
  Stream 1: 58-D Handcrafted DSP (src.features.extract_features)
  Stream 2: 1024-D Self-Supervised Latents (facebook/mms-300m)
Target Languages: English, Hindi, Tamil
"""

import os
import json
import time
import joblib
import numpy as np
import torch
import torch.nn as nn

try:
    from transformers import AutoFeatureExtractor, AutoModel
    _TRANSFORMERS_AVAILABLE = True
except ImportError:
    _TRANSFORMERS_AVAILABLE = False

from src.features import extract_features


class GatedDualStreamFusion(nn.Module):
    """Exact PyTorch neural architecture matching trained Colab weights."""
    def __init__(self, ssl_dim: int = 1024, dsp_dim: int = 58, proj_dim: int = 128):
        super().__init__()
        self.dsp_proj = nn.Sequential(
            nn.Linear(dsp_dim, proj_dim),
            nn.LayerNorm(proj_dim),
            nn.GELU(),
            nn.Dropout(0.2)
        )
        self.ssl_proj = nn.Sequential(
            nn.Linear(ssl_dim, proj_dim),
            nn.LayerNorm(proj_dim),
            nn.GELU(),
            nn.Dropout(0.2)
        )
        self.gate = nn.Parameter(torch.tensor([0.5]))

        self.classifier = nn.Sequential(
            nn.Linear(proj_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.GELU(),
            nn.Linear(64, 2)
        )

    def forward(self, dsp_x, ssl_x):
        p_dsp = self.dsp_proj(dsp_x)
        p_ssl = self.ssl_proj(ssl_x)
        g = torch.sigmoid(self.gate)
        fused = g * p_ssl + (1.0 - g) * p_dsp
        logits = self.classifier(fused)
        return logits, g


class DualStreamFusionClassifier:
    """Production wrapper for loading and evaluating the Fused Acoustic Model."""

    CONFIG_PATH = "reports/fused_acoustic_config.json"
    MODEL_PATH = "reports/fused_acoustic_model.pt"
    SCALER_PATH = "reports/fused_acoustic_scaler.joblib"

    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = None
        self.scaler = None
        self.config = {}
        self.mms_fe = None
        self.mms_model = None
        self._load_artifacts()

    def _load_artifacts(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_path = self.MODEL_PATH if os.path.exists(self.MODEL_PATH) else os.path.join(base_dir, self.MODEL_PATH)
        scaler_path = self.SCALER_PATH if os.path.exists(self.SCALER_PATH) else os.path.join(base_dir, self.SCALER_PATH)
        config_path = self.CONFIG_PATH if os.path.exists(self.CONFIG_PATH) else os.path.join(base_dir, self.CONFIG_PATH)

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print(f"[AcousticModel] Warning: Model weights not found at {model_path}")
            return

        # 1. Load config
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)

        ssl_dim = self.config.get("ssl_dim", 1024)
        dsp_dim = self.config.get("dsp_dim", 58)
        proj_dim = self.config.get("proj_dim", 128)

        # 2. Load DSP StandardScaler
        self.scaler = joblib.load(scaler_path)

        # 3. Load PyTorch model weights
        self.model = GatedDualStreamFusion(ssl_dim=ssl_dim, dsp_dim=dsp_dim, proj_dim=proj_dim)
        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()

        # 4. Lazy-load Hugging Face MMS-300M on CPU
        if _TRANSFORMERS_AVAILABLE:
            try:
                model_name = self.config.get("model_name", "facebook/mms-300m")
                self.mms_fe = AutoFeatureExtractor.from_pretrained(
                    model_name, local_files_only=True
                )
                self.mms_model = AutoModel.from_pretrained(
                    model_name, local_files_only=True
                ).to(self.device)
                self.mms_model.eval()
                for p in self.mms_model.parameters():
                    p.requires_grad = False

                # Warm-up pass to eliminate first-call latency.
                try:
                    _ = self.predict(np.zeros(16000, dtype=np.float32))
                except Exception:
                    pass
            except Exception as e:
                print(f"[AcousticModel] Could not load Hugging Face backbone: {e}")

    def predict(self, audio_1s: np.ndarray, sr: int = 16000) -> dict:
        """
        Executes Dual-Stream Forward Pass:
        Returns: {ai_probability, risk_level, alert_triggered, modality_gate, latency_ms}
        """
        t_start = time.perf_counter()

        if len(audio_1s) < 16000:
            audio_1s = np.pad(audio_1s, (0, 16000 - len(audio_1s)))
        else:
            audio_1s = audio_1s[:16000]

        audio_1s = np.clip(audio_1s, -1.0, 1.0).astype(np.float32)

        # Stream 1: 58-D Handcrafted DSP
        dsp_raw = extract_features(audio_1s, sr=sr).reshape(1, -1)
        if self.scaler is not None:
            dsp_norm = self.scaler.transform(dsp_raw)
        else:
            dsp_norm = dsp_raw

        dsp_tensor = torch.tensor(dsp_norm, dtype=torch.float32).to(self.device)

        # Stream 2: MMS-300M Latent
        if self.mms_model is not None and self.mms_fe is not None:
            inputs = self.mms_fe(audio_1s, sampling_rate=sr, return_tensors="pt").to(self.device)
            with torch.no_grad():
                out = self.mms_model(**inputs).last_hidden_state
                ssl_tensor = torch.mean(out, dim=1)
        else:
            # Fallback zero-latent if transformers not loaded yet
            ssl_tensor = torch.zeros((1, 1024), dtype=torch.float32).to(self.device)

        # Dual-Stream Gated Forward Pass
        with torch.no_grad():
            logits, gate = self.model(dsp_tensor, ssl_tensor)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
            ai_prob = float(probs[1])
            gate_val = float(gate.item())

        elapsed_ms = (time.perf_counter() - t_start) * 1000.0
        risk = "HIGH" if ai_prob >= 0.70 else "MEDIUM" if ai_prob >= 0.40 else "LOW"

        return {
            "ai_probability": round(ai_prob, 4),
            "risk_level": risk,
            "alert_triggered": ai_prob >= 0.70,
            "modality_gate_alpha": round(gate_val, 3),
            "model_version": "mms300m-dsp58-dual-stream-v1",
            "target_languages": ["en", "hi", "ta"],
            "latency_ms": round(elapsed_ms, 2)
        }