import os
import joblib
import librosa
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from src.features import extract_features

# 1. Load manifest
df = pd.read_csv("reports/manifest_vocoder.csv")

X, y_raw = [], []

print("Extracting features from audio files...")
for _, row in df.iterrows():
    filepath = row["filepath"]
    if os.path.exists(filepath):
        try:
            y_audio, _ = librosa.load(filepath, sr=16000, mono=True)
            if len(y_audio) >= 16000:
                vec = extract_features(y_audio[:16000])
                X.append(vec)
                y_raw.append(row["engine"])
        except Exception:
            continue

X = np.array(X, dtype=np.float32)

# 2. Automatically map text labels to 0, 1, 2...
le = LabelEncoder()
y = le.fit_transform(y_raw)

print(f"Loaded {len(X)} audio samples across engines: {np.unique(y_raw)}")

# 3. Train Classifier
num_classes = len(np.unique(y))

if num_classes > 1:
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = XGBClassifier(n_estimators=100, max_depth=5, random_state=42)
    clf.fit(X_train, y_train)
else:
    # If only 1 engine exists, train on all data
    clf = XGBClassifier(n_estimators=100, max_depth=5, random_state=42)
    clf.fit(X, y)

# 4. Save model and label encoder
os.makedirs("reports", exist_ok=True)
joblib.dump(clf, "reports/vocoder_classifier.joblib")
joblib.dump(le, "reports/vocoder_label_encoder.joblib")

print("Successfully trained and saved model to reports/vocoder_classifier.joblib")