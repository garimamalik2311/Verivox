# Base image with Python + system audio deps
FROM python:3.11-slim

# FFmpeg handles conversion between WAV/MP3/M4A/OGG/FLAC before/around librosa
# PortAudio is required by sounddevice for microphone access
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    portaudio19-dev \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["python3", "src/pipeline.py"]
