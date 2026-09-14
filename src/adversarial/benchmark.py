"""
Adversarial robustness benchmark runner.

Usage:
    python3 -m src.adversarial.benchmark
"""

import asyncio
import itertools
import numpy as np
import pandas as pd

from src.file_loader import load_audio_file
from src.adversarial.ws_client import send_audio_and_collect
from src.adversarial.perturbations import (
    add_white_noise, add_pink_noise, add_background_music,
    mp3_roundtrip, opus_roundtrip, pitch_shift, time_stretch,
)


# ---------------------------------------------------------------------------
# Configure your labeled test files here — fill in real paths from data/raw/
# ---------------------------------------------------------------------------

BASELINE_FILES = {
    "real_1": ("data/raw/bonafide_en/11b7e16da84c/bonafide_en_17.wav", 0),
    "real_2": ("data/raw/bonafide_en/2b855e48212f/bonafide_en_40.wav", 0),
    "fake_1": ("data/raw/spoof_en/indic_synth_en_11/spoof_en_11.wav", 1),
    "fake_2": ("data/raw/spoof_en/west_synth_6/spoof_en_111.wav", 1),
}

ATTACKS = {
    "white_noise": [
        (add_white_noise, {"snr_db": db}) for db in [20, 10, 5, 0]
    ],
    "pink_noise": [
        (add_pink_noise, {"snr_db": db}) for db in [20, 10, 5, 0]
    ],
    "mp3_compress": [
        (mp3_roundtrip, {"bitrate_kbps": b}) for b in [128, 64, 32]
    ],
    "opus_compress": [
        (opus_roundtrip, {"bitrate_kbps": b}) for b in [64, 32, 16, 8]
    ],
    "pitch_shift": [
        (pitch_shift, {"n_semitones": n}) for n in [-2, -1, 1, 2]
    ],
    "time_stretch": [
        (time_stretch, {"rate": r}) for r in [0.9, 0.95, 1.05, 1.1]
    ],
}


async def run_benchmark():
    results_table = []

    for filename, (path, label) in BASELINE_FILES.items():
        audio = load_audio_file(path)

        baseline_results = await send_audio_and_collect(audio, f"baseline_{filename}")
        if not baseline_results:
            print(f"⚠️  No results for baseline {filename} — skipping")
            continue
        baseline_prob = np.mean([r["ai_probability"] for r in baseline_results])
        baseline_pred = int(baseline_prob >= 0.5)

        print(f"[{filename}] baseline ai_probability={baseline_prob:.3f} (label={label})")

        for attack_name, param_list in ATTACKS.items():
            for fn, params in param_list:
                perturbed = fn(audio, **params)
                stream_id = f"{attack_name}_{filename}_{'_'.join(f'{k}{v}' for k, v in params.items())}"
                rr = await send_audio_and_collect(perturbed, stream_id)

                if not rr:
                    print(f"  ⚠️  {attack_name} {params} on {filename} — no results returned")
                    continue

                perturbed_prob = np.mean([r["ai_probability"] for r in rr])
                perturbed_pred = int(perturbed_prob >= 0.5)
                flipped = perturbed_pred != baseline_pred

                results_table.append({
                    "file": filename,
                    "true_label": label,
                    "attack": attack_name,
                    "params": str(params),
                    "baseline_prob": baseline_prob,
                    "perturbed_prob": perturbed_prob,
                    "delta": perturbed_prob - baseline_prob,
                    "prediction_flipped": flipped,
                })

                print(f"  {attack_name} {params}: prob {baseline_prob:.3f} -> {perturbed_prob:.3f} "
                      f"{'⚠️ FLIPPED' if flipped else ''}")

    df = pd.DataFrame(results_table)
    df.to_csv("reports/adversarial/adversarial_robustness_results.csv", index=False)
    print(f"\nSaved {len(df)} results to reports/adversarial/adversarial_robustness_results.csv")
    return df


if __name__ == "__main__":
    asyncio.run(run_benchmark())