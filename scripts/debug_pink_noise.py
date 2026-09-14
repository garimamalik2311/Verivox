import numpy as np
from src.adversarial.perturbations import add_pink_noise

audio = np.random.uniform(-0.3, 0.3, 16000).astype(np.float32)
noisy = add_pink_noise(audio, snr_db=20)

signal_power = np.mean(audio**2)
actual_noise_power = np.mean((noisy - audio)**2)
actual_snr_db = 10 * np.log10(signal_power / actual_noise_power)
print(f"Requested 20dB, actual measured SNR: {actual_snr_db:.1f}dB")