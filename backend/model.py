"""
model.py - Model loading and inference for Brain Tumor Detection API.

Uses brain_tumor_model.keras — an Xception-based, 4-class model
(glioma, meningioma, notumor, pituitary), expecting 299x299x3 RGB input.

The model is loaded ONCE at server startup and reused for all requests.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List

import numpy as np

# ─────────────────────────────────────────────────────────────────────────────
# Class definitions — must match training order (alphabetical = Keras default)
# ─────────────────────────────────────────────────────────────────────────────
CLASS_NAMES: List[str] = ["glioma", "meningioma", "notumor", "pituitary"]

CLASS_DISPLAY: Dict[str, str] = {
    "glioma":     "Glioma",
    "meningioma": "Meningioma",
    "notumor":    "No Tumor",
    "pituitary":  "Pituitary Tumor",
}

CLASS_ARABIC: Dict[str, str] = {
    "glioma":     "ورم دبقي (Glioma)",
    "meningioma": "ورم السحايا (Meningioma)",
    "notumor":    "لا يوجد ورم",
    "pituitary":  "ورم الغدة النخامية (Pituitary)",
}

CLASS_SEVERITY: Dict[str, str] = {
    "glioma":     "high",
    "meningioma": "medium",
    "notumor":    "none",
    "pituitary":  "medium",
}

# Model input size — Xception backbone expects 299x299
IMG_SIZE = (299, 299)

# Singleton — loaded once at startup
_model = None


def get_model_path() -> Path:
    """
    Resolve the path to the .keras model file.
    Priority:
      1. MODEL_PATH env variable (for deployment override)
      2. Default: brain_tumor_model.keras in same folder as this file
    """
    env_path = os.environ.get("MODEL_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            return p
        raise FileNotFoundError(f"MODEL_PATH env var set but file not found: {env_path}")

    here = Path(__file__).resolve().parent
    default = here / "brain_tumor_model.keras"
    if default.exists():
        return default

    raise FileNotFoundError(
        f"Cannot find model file.\nLooked at: {default}\n"
        "Make sure brain_tumor_model.keras is in the backend/ folder."
    )


def load_model() -> None:
    """Load the Keras model into memory."""
    global _model
    import tensorflow as tf
    import traceback

    model_path = get_model_path()
    print(f"[model] Loading: {model_path}")

    try:
        _model = tf.keras.models.load_model(
            str(model_path),
            compile=False,
        )
        print("[model] Loaded successfully!")

    except Exception:
        print("=" * 80)
        print("MODEL LOAD ERROR:")
        traceback.print_exc()
        print("=" * 80)
        raise

    n_out = int(_model.output_shape[-1])
    if n_out != len(CLASS_NAMES):
        print(
            f"[model] WARNING: model has {n_out} output units but "
            f"CLASS_NAMES has {len(CLASS_NAMES)} entries: {CLASS_NAMES}"
        )
    print(f"[model] Model loaded. Output classes: {n_out} -> {CLASS_NAMES}")


def predict(batch: np.ndarray) -> Dict:
    """
    Run inference and return a structured prediction dict.

    Parameters
    ----------
    batch : float32 numpy array of shape (1, 299, 299, 3),
            already preprocessed with Xception's preprocess_input
            (see utils.preprocess_bytes).

    Returns
    -------
    {
        "prediction":     "glioma" | "meningioma" | "notumor" | "pituitary",
        "display_name":   "Glioma" | "Meningioma" | "No Tumor" | "Pituitary Tumor",
        "arabic_name":    "ورم دبقي" | "ورم السحايا" | "لا يوجد ورم" | "ورم الغدة النخامية",
        "confidence":     0.9823,
        "confidence_pct": 98.23,
        "is_tumor":       true | false,
        "severity":       "high" | "medium" | "none",
        "per_class": {
            "glioma": ...,
            "meningioma": ...,
            "notumor": ...,
            "pituitary": ...
        }
    }
    """
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")

    probs = _model.predict(batch, verbose=0)[0]  # shape (4,)

    pred_idx   = int(np.argmax(probs))
    pred_class = CLASS_NAMES[pred_idx]
    confidence = float(probs[pred_idx])

    per_class = {
        CLASS_NAMES[i]: round(float(probs[i]) * 100, 2)
        for i in range(len(CLASS_NAMES))
    }

    return {
        "prediction":     pred_class,
        "display_name":   CLASS_DISPLAY[pred_class],
        "arabic_name":    CLASS_ARABIC[pred_class],
        "confidence":     round(confidence, 4),
        "confidence_pct": round(confidence * 100, 2),
        # 4-class model includes "notumor" — is_tumor is now derived, not hardcoded
        "is_tumor":       pred_class != "notumor",
        "severity":       CLASS_SEVERITY[pred_class],
        "per_class":      per_class,
    }