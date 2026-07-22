"""
utils.py - Image preprocessing for Brain Tumor Detection API.

EfficientNet-B2 expects:
  - Input size: 260 x 260 pixels
  - Raw RGB values in [0, 255] (no divide by 255)
  - Shape: (1, 260, 260, 3) float32
"""
from __future__ import annotations

import io
from typing import Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

IMG_SIZE = 224          # EfficientNet-B2 native resolution
MAX_BYTES = 20 * 1024 * 1024   # 20 MB upload cap


def preprocess_bytes(raw_bytes: bytes, img_size: int = IMG_SIZE) -> Tuple[np.ndarray, Tuple[int, int]]:
    """
    Decode image bytes → float32 numpy batch (1, 260, 260, 3).

    Returns
    -------
    batch      : shape (1, img_size, img_size, 3), dtype float32, range [0, 255]
    orig_size  : (width, height) of the original image
    """
    if len(raw_bytes) > MAX_BYTES:
        raise ValueError(
            f"Image too large ({len(raw_bytes) / 1_048_576:.1f} MB). Max: {MAX_BYTES // 1_048_576} MB."
        )

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes))
    except (UnidentifiedImageError, Exception) as exc:
        raise ValueError(f"Cannot decode image: {exc}") from exc

    orig_size = pil_img.size  # (width, height)

    if min(orig_size) < 32:
        raise ValueError(f"Image too small ({orig_size[0]}x{orig_size[1]} px). Min: 32 px.")

    # Convert to RGB (handles grayscale, RGBA, palette images, etc.)
    pil_img = pil_img.convert("RGB")

    # Resize to model's native resolution
    resized = pil_img.resize((img_size, img_size), Image.LANCZOS)

    # Build batch: (1, H, W, 3) float32 in [0, 255]
    arr = np.asarray(resized, dtype=np.float32)
    batch = arr[np.newaxis, ...]

    return batch, orig_size


def validate_image_format(content_type: str | None, filename: str | None) -> None:
    """Raise ValueError if the uploaded file is not an accepted image format."""
    ALLOWED_MIME = {
        "image/jpeg", "image/jpg", "image/png",
        "image/bmp", "image/tiff", "image/webp",
    }
    ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

    if content_type and content_type.lower().split(";")[0].strip() not in ALLOWED_MIME:
        raise ValueError(
            f"Unsupported file type: '{content_type}'. Accepted: JPEG, PNG, BMP, TIFF, WebP."
        )

    if filename:
        import pathlib
        ext = pathlib.Path(filename).suffix.lower()
        if ext and ext not in ALLOWED_EXT:
            raise ValueError(
                f"Unsupported extension: '{ext}'. Accepted: {', '.join(sorted(ALLOWED_EXT))}."
            )
