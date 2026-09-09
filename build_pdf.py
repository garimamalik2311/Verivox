from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Preformatted, ListFlowable, ListItem
)
from reportlab.lib import colors

doc = SimpleDocTemplate(
    "/home/claude/voice-ingestion/Sprint1A_Explainer.pdf",
    pagesize=letter,
    topMargin=0.75*inch, bottomMargin=0.75*inch,
    leftMargin=0.75*inch, rightMargin=0.75*inch,
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", fontSize=22, leading=26, spaceAfter=6, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle(name="Subtitle", fontSize=12, leading=16, textColor=colors.HexColor("#555555"), spaceAfter=20))
styles.add(ParagraphStyle(name="H1", fontSize=16, leading=20, spaceBefore=18, spaceAfter=8, fontName="Helvetica-Bold", textColor=colors.HexColor("#1a1a1a")))
styles.add(ParagraphStyle(name="H2", fontSize=13, leading=16, spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a2a2a")))
styles.add(ParagraphStyle(name="Body", fontSize=10.5, leading=15, spaceAfter=8, fontName="Helvetica"))
styles.add(ParagraphStyle(name="BodyBold", parent=styles["Body"], fontName="Helvetica-Bold"))
styles.add(ParagraphStyle(name="CodeBlock", fontSize=8.3, leading=11, fontName="Courier", backColor=colors.HexColor("#f5f5f5"), borderPadding=6, leftIndent=4))
styles.add(ParagraphStyle(name="Caption", fontSize=9, leading=12, textColor=colors.HexColor("#666666"), fontName="Helvetica-Oblique", spaceAfter=10))

story = []

def h1(t): story.append(Paragraph(t, styles["H1"]))
def h2(t): story.append(Paragraph(t, styles["H2"]))
def body(t): story.append(Paragraph(t, styles["Body"]))
def code(t): story.append(Preformatted(t, styles["CodeBlock"]))
def caption(t): story.append(Paragraph(t, styles["Caption"]))
def bullets(items):
    story.append(ListFlowable(
        [ListItem(Paragraph(i, styles["Body"]), bulletColor=colors.HexColor("#444444")) for i in items],
        bulletType="bullet", start="circle", leftIndent=16
    ))

# ---------------- Title Page ----------------
story.append(Spacer(1, 1.2*inch))
story.append(Paragraph("Sprint 1A — Voice Ingestion Pipeline", styles["TitleBig"]))
story.append(Paragraph("A file-by-file, function-by-function walkthrough of the setup, VAD, and windowing work for the SIH voice-deepfake-detection project.", styles["Subtitle"]))
story.append(Spacer(1, 0.3*inch))
body("<b>Scope covered:</b> project setup, dependencies &amp; Docker, central config, "
     "microphone capture, multi-format file loading, WebRTC voice activity detection, "
     "and the overlapping-window accumulator.")
body("<b>Not covered here</b> (belongs to other sprints): feature extraction, dataset "
     "download/preprocessing (Sprint 1B), model training/evaluation (Sprint 2), and the "
     "WebSocket streaming server / risk aggregation (Sprint 3).")
story.append(PageBreak())

# ---------------- 1. Big Picture ----------------
h1("1. The Big Picture")
body("Sprint 1A is the <b>entry point</b> of the whole detection system. Before any AI model "
     "can decide 'real voice' vs 'AI voice', raw audio has to be captured, cleaned up, and cut "
     "into consistent, predictable chunks. That is everything in this document.")
body("The flow, end to end:")
code(
"  MICROPHONE ─┐\n"
"              ├──▶ standardize to 16kHz mono ──▶ VAD (strip silence) ──▶\n"
"  AUDIO FILE ─┘                                                          \\\n"
"                                                                          ▼\n"
"                                          Window Accumulator (1s windows,\n"
"                                           50% overlap) ──▶ [ready for\n"
"                                           Sprint 1B feature extraction]"
)
h2("Why each stage exists")
bullets([
    "<b>Standardize format</b> — different files come in at different sample rates, channel counts, and formats (WAV/MP3/M4A/OGG/FLAC). Everything downstream assumes one consistent format: 16kHz, mono. Without this step, every other module would need format-handling logic duplicated everywhere.",
    "<b>VAD (silence removal)</b> — a real phone call is full of pauses, breathing, background noise. Feeding all of that into a detection model wastes compute and adds noise to the decision. VAD keeps only the parts where someone is actually speaking.",
    "<b>Windowing</b> — ML models need fixed-size input. A 1-second window is a good balance: long enough to capture meaningful voice characteristics, short enough for real-time / low-latency response. 50% overlap means no information is lost at window boundaries, and it smooths the model's scoring over time.",
])

# ---------------- 2. Tech Stack ----------------
h1("2. Tech Stack — What Each Library Does")
tech_data = [
    ["Library", "Role in this pipeline"],
    ["sounddevice", "Opens a live microphone stream and calls your code back with new audio as it arrives (the 'streaming callback pattern')."],
    ["librosa", "Loads audio files of any supported format and resamples/downmixes them to 16kHz mono in one call."],
    ["webrtcvad", "Google's WebRTC voice activity detector. Classifies small (20ms) frames of audio as speech or non-speech."],
    ["soundfile", "Reads/writes WAV/FLAC audio; used here to generate test audio and works alongside librosa."],
    ["numpy", "All audio is represented as numpy float32 arrays — this is the common currency between every module."],
    ["FFmpeg (via Docker)", "Handles decoding of compressed formats (MP3, M4A, OGG) that soundfile can't read natively; librosa/audioread calls it under the hood."],
    ["pytest", "Runs the automated test suite (tests/test_pipeline.py) to verify correctness."],
]
t = Table(tech_data, colWidths=[1.6*inch, 4.6*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2a2a2a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (0,1), (-1,-1), "Helvetica"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f7f7f7")]),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 10))

h2("On the datasets and papers you shared")
body("ASVspoof 2019, MAVOS-DD, SEA-Spoof, the DEEP-VOICE links, Svarah, and the wav2vec2-XLS-R "
     "model are all relevant to <b>feature extraction and model training</b> — they contain "
     "labeled real/fake audio used to train the XGBoost classifier, or (in wav2vec2's case) "
     "could be used as a learned feature extractor instead of hand-crafted MFCC features. "
     "None of that is used in Sprint 1A: your job produces clean, windowed <i>audio</i>, not "
     "features or predictions. Whoever owns Sprint 1B will consume your output and reach for "
     "those resources next.")

story.append(PageBreak())

# ---------------- 3. Project Structure ----------------
h1("3. Project Structure")
code(
"voice-ingestion/\n"
"├── requirements.txt        Python dependencies\n"
"├── .gitignore\n"
"├── README.md                Setup + run instructions\n"
"├── docker/\n"
"│   └── Dockerfile           Containerized environment (FFmpeg + Python deps)\n"
"├── src/\n"
"│   ├── config.py             Shared constants — single source of truth\n"
"│   ├── file_loader.py        File input: any format -> 16kHz mono array\n"
"│   ├── mic_capture.py        Live microphone streaming\n"
"│   ├── vad.py                 Voice activity detection (WebRTC)\n"
"│   ├── window_accumulator.py Buffers speech into overlapping 1s windows\n"
"│   └── pipeline.py            Wires it all together, entry point\n"
"├── tests/\n"
"│   └── test_pipeline.py       Automated correctness tests (pytest)\n"
"└── data/                      Local test audio (gitignored)"
)

# ---------------- 4. config.py ----------------
h1("4. config.py — The Shared Settings File")
body("Every other file imports its constants from here. This is intentional: if 'window size' "
     "or 'sample rate' were hardcoded separately in five files, changing one would silently "
     "break the others. One file, one source of truth.")
h2("Key values")
bullets([
    "<b>SAMPLE_RATE = 16000</b> — 16kHz is the team-agreed standard. It's high enough to capture speech frequencies clearly, but much lighter to process than 44.1kHz (CD quality), which matters for real-time performance.",
    "<b>WINDOW_DURATION_SEC = 1.0, WINDOW_OVERLAP = 0.5</b> — the sprint-plan requirements, translated into sample counts: <i>WINDOW_SIZE_SAMPLES = 16000</i> (1 second of audio at 16kHz) and <i>WINDOW_STRIDE_SAMPLES = 8000</i> (how far the window slides forward each time — half the window size, giving 50% overlap).",
    "<b>VAD_FRAME_MS = 20</b> — WebRTC VAD only accepts frames of exactly 10, 20, or 30ms. 20ms is the sprint-plan's choice, giving VAD_FRAME_SAMPLES = 320 samples per frame.",
    "<b>VAD_AGGRESSIVENESS = 2</b> — WebRTC VAD's sensitivity dial, from 0 (lets more audio through as 'speech') to 3 (filters hardest). 2 is a reasonable middle ground to start with; it's the first thing to tune if you see too much silence leaking through, or too much real speech getting cut.",
])

story.append(PageBreak())

# ---------------- 5. file_loader.py ----------------
h1("5. file_loader.py — Loading Pre-Recorded Audio")
body("Handles the 'someone uploads a call recording' path. One function does all the work "
     "because librosa already knows how to decode every required format internally.")
h2("load_audio_file(filepath)")
code(
"audio, _ = librosa.load(filepath, sr=SAMPLE_RATE, mono=(CHANNELS == 1))"
)
body("This single line does three things at once:")
bullets([
    "<b>Decodes</b> the file regardless of format (WAV/MP3/M4A/OGG/FLAC) — for compressed formats, librosa quietly delegates to FFmpeg/audioread under the hood.",
    "<b>Resamples</b> to 16kHz (<i>sr=SAMPLE_RATE</i>) — if the source file was recorded at, say, 44.1kHz, librosa mathematically resamples it down.",
    "<b>Downmixes</b> to mono (<i>mono=True</i>) — if the file is stereo, the two channels get averaged into one.",
])
body("It also validates the extension against SUPPORTED_FORMATS and raises clear errors "
     "(<i>ValueError</i>, <i>FileNotFoundError</i>) for bad input, rather than failing with a "
     "confusing library-internal traceback.")
h2("get_audio_duration(audio)")
body("A one-line helper: <i>len(audio) / SAMPLE_RATE</i>. Useful for logging/debugging "
     "('this file loaded as 12.4 seconds') without repeating that math everywhere.")

# ---------------- 6. mic_capture.py ----------------
h1("6. mic_capture.py — Live Microphone Streaming")
body("This handles the 'live call' path — audio that doesn't exist as a file, but arrives "
     "continuously in real time. It uses what the sprint plan calls a <b>streaming callback "
     "pattern</b>: instead of recording a fixed clip and waiting for it to finish, you open a "
     "persistent stream, and the audio library calls your function automatically every time a "
     "new chunk is ready.")
h2("class MicrophoneStreamer")
bullets([
    "<b>_callback(indata, frames, time_info, status)</b> — sounddevice invokes this automatically on a background audio thread whenever a new block of samples is captured. It just pushes the audio into a queue — kept minimal because callbacks need to return fast, or you'll drop audio.",
    "<b>start() / stop()</b> — open and close the underlying sd.InputStream.",
    "<b>chunks()</b> — a generator: your main code calls <i>for chunk in streamer.chunks():</i> and gets each new piece of audio as it becomes available, pulled off the queue that the callback is filling in the background.",
])
body("Why a queue between the callback and your code? The callback runs on a separate, "
     "high-priority audio thread that must never block. The queue lets your main program "
     "consume audio at its own pace without ever slowing down or interrupting the capture thread.")
caption("Note: this module needs an actual microphone device and cannot be exercised in a "
        "sandboxed/headless environment — test it on your own machine.")

story.append(PageBreak())

# ---------------- 7. vad.py ----------------
h1("7. vad.py — Voice Activity Detection")
body("Wraps Google's WebRTC VAD engine, which has a strict input requirement: 16-bit PCM audio, "
     "in frames of exactly 10/20/30ms. Our pipeline audio is float32 in the range [-1, 1] "
     "(the normal representation for processing), so there's a conversion step before every VAD call.")
h2("_float_to_pcm16(frame)")
code("pcm16 = (frame * 32768.0).clip(-32768, 32767).astype(np.int16)")
body("Float audio uses -1.0 to 1.0 to represent amplitude; 16-bit PCM uses integers from "
     "-32768 to 32767. Multiplying by 32768 converts one range to the other; <i>.clip()</i> "
     "guards against rare rounding overshoot at the boundary.")
h2("is_speech(frame)")
body("Validates the frame is exactly VAD_FRAME_SAMPLES (320 samples = 20ms) long, converts it "
     "to PCM16 bytes, and asks webrtcvad's engine for a True/False speech classification.")
h2("filter_speech(audio)")
body("The main entry point other modules use. Splits a full audio array into consecutive 20ms "
     "frames, classifies each one, and concatenates only the frames marked as speech — "
     "silence and non-speech noise are dropped entirely. Any leftover partial frame at the "
     "end (shorter than 20ms) is discarded, since VAD can't classify a fractional frame.")
body("The built-in test at the bottom of the file proves this works correctly: pure silence "
     "returns 0 samples kept, while a non-silent synthetic tone gets partially classified as "
     "speech-like — verified when you ran <i>python3 vad.py</i> above.")

# ---------------- 8. window_accumulator.py ----------------
h1("8. window_accumulator.py — Overlapping Windows")
body("The final stage: takes a continuous stream of VAD-filtered speech and slices it into "
     "fixed-size, overlapping windows — the format Sprint 1B's feature extraction expects.")
h2("class WindowAccumulator")
body("Maintains an internal buffer (<i>self._buffer</i>) that grows as new audio is pushed in.")
h2("push(audio_chunk)")
code(
"self._buffer = np.concatenate([self._buffer, audio_chunk])\n"
"while len(self._buffer) >= self.window_size:\n"
"    window = self._buffer[: self.window_size]\n"
"    windows.append(window.copy())\n"
"    self._buffer = self._buffer[self.stride:]   # <- advance by STRIDE, not window_size"
)
body("The key design detail is on the last line: after emitting a window, the buffer advances "
     "by <b>stride</b> (8000 samples / 0.5s) rather than by the full window size (16000 samples). "
     "That's what creates the 50% overlap — the next window reuses the second half of the "
     "previous one. If it advanced by the full window size instead, there would be no overlap "
     "at all.")
body("This design also means it works identically whether you feed it all your audio at once, "
     "or in small streaming chunks (e.g. 100ms pieces from the microphone) — which is exactly "
     "what <i>test_window_accumulator_streaming_chunks</i> in the test suite verifies.")
h2("reset()")
body("Clears the buffer — useful when a call ends or after a long silence, so old audio doesn't "
     "bleed into a new conversation's first window.")

story.append(PageBreak())

# ---------------- 9. pipeline.py ----------------
h1("9. pipeline.py — Wiring It All Together")
body("This is the file that actually runs (it's Docker's CMD). It connects the pieces above "
     "into the two real-world entry points: a file, or a live microphone.")
h2("process_file(filepath)")
code(
"audio = load_audio_file(filepath)                    # file_loader\n"
"speech_only = VoiceActivityDetector().filter_speech(audio)   # vad\n"
"windows = WindowAccumulator().push(speech_only)       # window_accumulator\n"
"return windows"
)
body("Three lines, three modules, one clean output: a list of 1-second windows ready for "
     "feature extraction.")
h2("process_mic_stream(duration_sec)")
body("The live equivalent: starts a MicrophoneStreamer, and for each incoming audio chunk, "
     "checks whether it's speech, pushes it into the accumulator, and <i>yields</i> any windows "
     "that become ready — a generator, so the caller can process windows as they arrive in "
     "real time rather than waiting for the whole stream to finish.")
caption("Like mic_capture.py, this function needs a real microphone and won't run in a "
        "sandboxed environment — verify it on your own machine.")

# ---------------- 10. Tests ----------------
h1("10. tests/test_pipeline.py — What's Verified")
tests_data = [
    ["Test", "What it proves"],
    ["test_config_values", "Sample rate / window / stride constants match the sprint spec (16kHz, 1s window, 0.5s stride)."],
    ["test_vad_rejects_silence", "Pure silence produces zero speech samples — VAD is actually filtering."],
    ["test_vad_frame_length_validation", "Passing a wrong-sized frame raises a clear error instead of failing silently."],
    ["test_window_accumulator_overlap_math", "2.5s of audio correctly produces 4 overlapping windows of exactly 16000 samples each."],
    ["test_window_accumulator_streaming_chunks", "Pushing audio all at once vs. in small streaming chunks produces identical windows — proves the accumulator is stream-safe."],
    ["test_window_accumulator_reset", "reset() actually empties the internal buffer."],
]
t2 = Table(tests_data, colWidths=[2.5*inch, 3.7*inch])
t2.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2a2a2a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (0,1), (-1,-1), "Helvetica"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#dddddd")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f7f7f7")]),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
]))
story.append(t2)
story.append(Spacer(1, 8))
body("All 6 tests passed when run in this session (<i>pytest tests/ -v</i>). Run them again "
     "on your own machine after setup to confirm your environment matches.")

story.append(PageBreak())

# ---------------- 11. Docker ----------------
h1("11. docker/Dockerfile — Containerized Environment")
body("Handles the 'configure Docker to handle audio format conversions with FFmpeg' "
     "requirement from the sprint plan. A container guarantees your teammates (and the judges' "
     "demo machine) get the exact same environment you developed in — no 'works on my machine' problems.")
bullets([
    "<b>FROM python:3.11-slim</b> — a lightweight Python base image.",
    "<b>apt-get install ffmpeg portaudio19-dev libsndfile1</b> — the system-level (non-Python) libraries these packages need: FFmpeg for decoding compressed audio formats, PortAudio for microphone access, libsndfile for WAV/FLAC I/O.",
    "<b>pip install -r requirements.txt</b> — installs the Python packages.",
    "<b>CMD [\"python3\", \"src/pipeline.py\"]</b> — what runs by default when the container starts.",
])
body("Build and run with:")
code("docker build -t voice-ingestion -f docker/Dockerfile .\ndocker run voice-ingestion")

# ---------------- 12. How to run locally ----------------
h1("12. Running It On Your Own Machine")
code(
"# 1. Create and activate a virtual environment\n"
"python3 -m venv venv\n"
"source venv/bin/activate        # Windows: venv\\Scripts\\activate\n\n"
"# 2. Install system dependency (PortAudio) - required by sounddevice\n"
"brew install portaudio                        # macOS\n"
"sudo apt-get install portaudio19-dev libsndfile1 ffmpeg   # Ubuntu/Debian\n\n"
"# 3. Install Python dependencies\n"
"pip install -r requirements.txt\n\n"
"# 4. Run the pipeline on a test file\n"
"cd src\n"
"python3 pipeline.py ../data/test_tone.wav\n\n"
"# 5. Run the test suite\n"
"cd ..\n"
"pip install pytest\n"
"pytest tests/ -v"
)

# ---------------- 13. Output contract ----------------
h1("13. Output Contract — What You Hand Off")
body("This is the single most important thing to agree on with the rest of the team before "
     "everyone starts building in parallel:")
code(
"Each window = np.ndarray\n"
"  shape: (16000,)\n"
"  dtype: float32\n"
"  values: [-1.0, 1.0]\n"
"  represents: exactly 1 second of 16kHz mono speech audio"
)
body("Sprint 1B's feature extraction and Sprint 3's streaming/aggregation both consume exactly "
     "this shape. As long as your output matches this contract, they can build against fake/mock "
     "windows now and swap in your real pipeline later without any integration surprises.")

doc.build(story)
print("PDF built successfully")
