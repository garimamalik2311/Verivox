# Voice Ingestion Pipeline — Sprint 1A (SIH)

Captures audio (mic or file), filters out non-speech, and slices it into
overlapping 1-second windows ready for feature extraction (Sprint 1B).

## Local setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install system dependency (PortAudio) — required by sounddevice
# macOS:
brew install portaudio
# Ubuntu/Debian:
sudo apt-get install portaudio19-dev libsndfile1 ffmpeg

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Run the pipeline on a test file
cd src
python3 pipeline.py ../data/test_tone.wav

# 5. Run tests
cd ..
pip install pytest
pytest tests/ -v
```

## Docker (alternative to local venv)

```bash
docker build -t voice-ingestion -f docker/Dockerfile .
docker run voice-ingestion
```

## Project structure

```
voice-ingestion/
├── requirements.txt
├── docker/
│   └── Dockerfile
├── src/
│   ├── config.py              # all shared constants
│   ├── file_loader.py         # WAV/MP3/M4A/OGG/FLAC -> 16kHz mono
│   ├── mic_capture.py         # live microphone streaming
│   ├── vad.py                 # WebRTC voice activity detection
│   ├── window_accumulator.py  # overlapping 1s window slicing
│   └── pipeline.py            # wires everything together
├── tests/
│   └── test_pipeline.py
└── data/                      # test audio files (gitignored)
```

## Output contract (for Sprint 1B / Sprint 3 to consume)

Each window is a `np.ndarray`, shape `(16000,)`, dtype `float32`, values in
`[-1.0, 1.0]`, representing exactly 1 second of 16kHz mono speech audio.
