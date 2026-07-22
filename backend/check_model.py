from tensorflow.keras.models import load_model

print("Loading model...")

model = load_model("brain_tumor_efficientnet_3class.keras")

print("✅ Model loaded successfully!")

model.summary()