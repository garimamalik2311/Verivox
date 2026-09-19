import pandas as pd
import glob
import os

records = []

# Search all .wav files deeply inside data/raw
for filepath in glob.glob("data/raw/**/*.wav", recursive=True):
    filename = os.path.basename(filepath)
    path_lower = filepath.lower()

    # Process only synthetic / spoof audio clips
    if "spoof" in path_lower or "fake" in path_lower or "synth" in path_lower:
        if "edge" in filename:
            engine = "Edge-TTS"
        elif "gtts" in filename:
            engine = "gTTS"
        elif "espeak" in filename:
            engine = "Espeak"
        else:
            engine = "Commercial-Clone"
            
        records.append({"filepath": filepath, "engine": engine})

df = pd.DataFrame(records)
os.makedirs("reports", exist_ok=True)
df.to_csv("reports/manifest_vocoder.csv", index=False)
print(f"Saved {len(df)} rows to reports/manifest_vocoder.csv")