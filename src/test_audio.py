
from datasets import load_dataset
import soundfile as sf

print("Loading dataset...")

ds = load_dataset(
    "SherryT997/IndicTTS-Deepfake-Challenge-Data",
    split="train",
    streaming=True,
)

print("Dataset loaded.")

for i, item in enumerate(ds):
    print(f"Sample {i + 1}: {item['language']} | is_tts={item['is_tts']} | id={item['id']}")

    audio = item["audio"]

    print("Audio type:", type(audio))

    try:
        samples = audio.get_all_samples()

        print("Samples type:", type(samples))
        print("Sample rate:", samples.sample_rate)
        print("Audio data shape:", samples.data.shape)

        audio_data = samples.data.numpy()

        # TorchCodec usually gives [channels, samples]
        if audio_data.ndim == 2:
            audio_data = audio_data.T

        output_path = "test_audio.wav"

        sf.write(
            output_path,
            audio_data,
            samples.sample_rate,
        )

        print(f"\nSUCCESS: wrote {output_path}")
        break

    except Exception as e:
        print("\nFAILED to decode audio:")
        print(type(e).__name__, e)
        break
