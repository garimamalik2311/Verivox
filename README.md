# VeriVox — Real-Time Multilingual Voice Deepfake Detection

VeriVox is a real-time synthetic voice and deepfake detection engine designed for Indian linguistic contexts (English, Hindi, and Indian regional accents).

---

## 1. Pipeline Architecture & Sprint Contracts

The pipeline operates on synchronized, low-latency audio processing:

* **Audio Ingestion Standard**: 16 kHz, Mono, `float32`, normalized $[-1.0, 1.0]$.
* **Window Geometry**: 1.0-second window (16,000 samples) with a 50% hop size (8,000 samples / 500 ms).
* **VAD Standard**: WebRTC VAD processes 20 ms frames (320 samples). Non-speech frames are discarded upstream.
* **Feature Vector Contract**: Exact 30-D `float32` vector extracted in $< 5\text{ ms}$ per 1-second window.

### 30-D Feature Order
* `[0:13]` (13 dims): MFCCs (mean across frames)
* `[13]` (1 dim): Spectral Centroid
* `[14]` (1 dim): Spectral Bandwidth
* `[15]` (1 dim): Spectral Rolloff
* `[16]` (1 dim): Zero-Crossing Rate (ZCR)
* `[17]` (1 dim): RMS Energy
* `[18:30]` (12 dims): Chroma STFT (12 pitch classes)

---

## 2. Completed Modules & Pre-Cached Datasets

The dataset ingestion and feature extraction engine is fully implemented:

* **Balanced Dataset**:
  * **English**: Symmetrical mix of Indian English (`Svarah`, Common Voice) and Western English (`garystafford/deepfake-audio-detection`).
  * **Hindi**: Bona fide native Hindi human speech and synthetic Hindi speech (`SherryT997/IndicTTS-Deepfake-Challenge-Data`).
  * Confound-free 2x2 matrix across labels (0 = Bona Fide, 1 = Spoof) and languages (`en`, `hi`).
* **Speaker-Disjoint Splits**:
  * 80/20 train/validation split generated using `GroupShuffleSplit` on `speaker_id` to eliminate vocal timbre leakage.
* **Pre-cached Artifacts (`data/processed/`)**:
  * `X_train.npy`: Shape `(5737, 30)` — 2,493 Real, 3,244 Spoof
  * `y_train.npy`: Shape `(5737,)`
  * `X_val.npy`: Shape `(1455, 30)` — 1,098 Real, 357 Spoof (unseen speakers)
  * `y_val.npy`: Shape `(1455,)`
  * `manifest.csv`: Full index of filepaths, speaker IDs, languages, and labels.

---

## 3. How to Run & Reproduce

### Setup Virtual Environment
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

