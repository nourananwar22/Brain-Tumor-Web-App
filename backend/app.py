"""
app.py - FastAPI Backend for Brain Tumor MRI Detection.

Endpoints:
    GET  /        → health check
    GET  /health  → detailed status (model loaded?)
    POST /predict → upload MRI image → get tumor prediction JSON

Run with:
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import model as brain_model
import utils


# ─────────────────────────────────────────────────────────────────────────────
# Startup / Shutdown: load model once
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Brain Tumor Detection API starting...")
    try:
        brain_model.load_model()
        print("[startup] Model ready! Accepting requests.")
    except FileNotFoundError as exc:
        print(f"[startup] WARNING: {exc}")
    yield
    print("[shutdown] Server stopped.")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Brain Tumor Detection API",
    description="Classifies brain MRI scans: Glioma · Meningioma · Pituitary Tumor",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Lovable frontend + local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "https://preview--neural-scan-guard.lovable.app",
        "https://neural-scan-guard.lovable.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Basic liveness check."""
    return {
        "status":  "ok",
        "message": "Brain Tumor Detection API is running!",
        "docs":    "/docs",
    }


@app.get("/health")
async def health():
    """Detailed health check — confirms model is loaded."""
    model_ready = brain_model._model is not None
    return {
        "status":        "ok" if model_ready else "degraded",
        "model_ready":   model_ready,
        "model_classes": brain_model.CLASS_NAMES if model_ready else None,
        "message": (
            "Model loaded and ready for predictions."
            if model_ready
            else "Model not loaded — check server logs."
        ),
    }


@app.post("/predict")
async def predict(file: UploadFile = File(..., description="Brain MRI image (JPEG/PNG)")):
    """
    Upload an MRI image → get tumor classification.

    Returns JSON:
    {
        "prediction":     "glioma",
        "display_name":   "Glioma",
        "arabic_name":    "ورم دبقي (Glioma)",
        "confidence":     0.9823,
        "confidence_pct": 98.23,
        "is_tumor":       true,
        "severity":       "high",
        "per_class":      { "glioma": 98.23, "meningioma": 1.12, "pituitary": 0.65 },
        "image_info":     { "filename": "scan.jpg", "original_size": [512, 512] },
        "processing_time_ms": 145
    }
    """
    # 1. Check model is ready
    if brain_model._model is None:
        raise HTTPException(
            status_code=503,
            detail={"error": "model_not_ready", "message": "Model is not loaded. Check server logs."},
        )

    # 2. Validate file type
    try:
        utils.validate_image_format(file.content_type, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": "invalid_format", "message": str(exc)})

    # 3. Read image bytes
    raw_bytes = await file.read()

    # 4. Preprocess
    t_start = time.perf_counter()
    try:
        batch, orig_size = utils.preprocess_bytes(raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": "preprocessing_failed", "message": str(exc)})

    # 5. Predict
    try:
        result = brain_model.predict(batch)
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": "prediction_failed", "message": str(exc)})

    elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)

    # 6. Return response
    return JSONResponse(content={
        **result,
        "image_info": {
            "filename":         file.filename or "unknown",
            "original_size":    list(orig_size),
            "model_input_size": utils.IMG_SIZE,
        },
        "processing_time_ms": elapsed_ms,
    })