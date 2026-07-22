import tensorflow as tf
from pathlib import Path

models = [
    "brain_model1.keras",
    "brain_model2.keras",
    "brain_model3.keras",
    "brain_model4.keras",
]

for model_name in models:
    print("=" * 60)
    print(f"Testing: {model_name}")

    path = Path(model_name)

    if not path.exists():
        print("❌ File not found")
        continue

    print(f"📦 Size: {path.stat().st_size / (1024*1024):.2f} MB")

    try:
        model = tf.keras.models.load_model(path)
        print("✅ Model loaded successfully")
        print("Input Shape :", model.input_shape)
        print("Output Shape:", model.output_shape)

    except Exception as e:
        print("❌ Error:")
        print(e)
