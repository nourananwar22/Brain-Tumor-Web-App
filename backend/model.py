"""
model.py - Model loading and inference for Brain Tumor Detection API.

Uses brain_tumor_efficientnet_3class.keras (3-class: glioma, meningioma, pituitary)
which is in the same backend/ folder.

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
CLASS_NAMES: List[str] = ["glioma", "meningioma", "pituitary"]

CLASS_DISPLAY: Dict[str, str] = {
    "glioma":     "Glioma",
    "meningioma": "Meningioma",
    "pituitary":  "Pituitary Tumor",
}

CLASS_ARABIC: Dict[str, str] = {
    "glioma":     "ورم دبقي (Glioma)",
    "meningioma": "ورم السحايا (Meningioma)",
    "pituitary":  "ورم الغدة النخامية (Pituitary)",
}

CLASS_SEVERITY: Dict[str, str] = {
    "glioma":     "high",
    "meningioma": "medium",
    "pituitary":  "medium",
}

# Singleton — loaded once at startup
_model = None


def get_model_path() -> Path:
    """
    Resolve the path to the .keras model file.
    Priority:
      1. MODEL_PATH env variable (for deployment override)
      2. Default: brain_tumor_efficientnet_3class.keras in same folder as this file
    """
    env_path = os.environ.get("MODEL_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            return p
        raise FileNotFoundError(f"MODEL_PATH env var set but file not found: {env_path}")

    here = Path(__file__).resolve().parent
    default = here / "brain_tumor_efficientnet_3class.keras"
    if default.exists():
        return default

    raise FileNotFoundError(
        f"Cannot find model file.\nLooked at: {default}\n"
        "Make sure brain_tumor_efficientnet_3class.keras is in the backend/ folder."
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

    except Exception as e:
        print("=" * 80)
        print("MODEL LOAD ERROR:")
        traceback.print_exc()
        print("=" * 80)
        raise

    n_out = int(_model.output_shape[-1])
    print(f"[model] Model loaded. Output classes: {n_out} -> {CLASS_NAMES}")


def predict(batch: np.ndarray) -> Dict:
    """
    Run inference and return a structured prediction dict.

    Parameters
    ----------
    batch : float32 numpy array of shape (1, 260, 260, 3)

    Returns
    -------
    {
        "prediction":     "glioma" | "meningioma" | "pituitary",
        "display_name":   "Glioma" | ...,
        "arabic_name":    "ورم دبقي" | ...,
        "confidence":     0.9823,
        "confidence_pct": 98.23,
        "is_tumor":       true,
        "severity":       "high" | "medium",
        "per_class":      { class: confidence_pct, ... }
    }
    """
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")

    probs = _model.predict(batch, verbose=0)[0]  # shape (3,)

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
        "is_tumor":       True,   # 3-class model only predicts tumors
        "severity":       CLASS_SEVERITY[pred_class],
        "per_class":      per_class,
    }
