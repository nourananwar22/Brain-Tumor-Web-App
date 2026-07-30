"""
utils.py - Image validation & preprocessing helpers for the Brain Tumor API.

The model (Xception backbone) expects:
    - RGB images
    - resized to 299x299
    - pixel values scaled the way Xception's preprocess_input does it
      (scaled to the range [-1, 1]), NOT simple /255 normalization.
"""
from __future__ import annotations

import io
from typing import Tuple

import numpy as np
from PIL import Image

from model import IMG_SIZE  # (299, 299) — keep in sync with model.py

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/bmp", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def validate_image_format(content_type: str | None, filename: str | None) -> None:
    """Raise ValueError if the uploaded file doesn't look like a supported image."""
    ok_type = bool(content_type) and content_type.lower() in ALLOWED_CONTENT_TYPES
    ok_ext = bool(filename) and any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

    if not (ok_type or ok_ext):
        raise ValueError(
            f"Unsupported file type (content_type={content_type!r}, filename={filename!r}). "
            "Please upload a JPEG, PNG, BMP, or WEBP image."
        )


def preprocess_bytes(raw_bytes: bytes) -> Tuple[np.ndarray, Tuple[int, int]]:
    """
    Convert raw uploaded image bytes into a model-ready batch.

    Returns
    -------
    batch      : float32 numpy array of shape (1, 299, 299, 3), scaled to [-1, 1]
    orig_size  : (width, height) of the original uploaded image
    """
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img.load()
    except Exception as exc:
        raise ValueError(f"Could not read image file: {exc}") from exc

    orig_size = img.size  # (width, height)

    # Ensure 3-channel RGB (handles grayscale MRIs, RGBA PNGs, etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    img = img.resize(IMG_SIZE, Image.BILINEAR)

    arr = np.asarray(img).astype("float32")  # (299, 299, 3), values 0-255

    # Xception preprocess_input: scale to [-1, 1]
    arr = (arr / 127.5) - 1.0

    batch = np.expand_dims(arr, axis=0)  # (1, 299, 299, 3)

    return batch, orig_size