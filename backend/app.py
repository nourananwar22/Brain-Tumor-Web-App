"""
app.py - FastAPI Backend for Brain Tumor MRI Detection.

Endpoints:
    GET  /            → health check
    GET  /health       → detailed status (model loaded?)
    POST /login         → doctor authentication
    POST /predict       → upload MRI image → get tumor prediction JSON
    GET  /patients      → list patients with their latest diagnosis + doctor
    GET  /patients/{id} → full record for a single patient (all scans)

Run with:
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import pyodbc

from database import get_db

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
    description="Classifies brain MRI scans: Glioma · Meningioma · Pituitary Tumor · No Tumor",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Lovable frontend + local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:8083",
        "https://preview--neural-scan-guard.lovable.app",
        "https://neural-scan-guard.lovable.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Doctor credentials (username/password → real DoctorID in the database)
# ─────────────────────────────────────────────────────────────────────────────
DOCTOR_CREDENTIALS = {
    "mohamed.elsayed": {"password": "123456", "doctor_id": 1},   # Head Doctor
    "sara.ahmed":       {"password": "123456", "doctor_id": 2},
    "omar.hassan":      {"password": "123456", "doctor_id": 3},
    "nour.mahmoud":     {"password": "123456", "doctor_id": 4},
    "youssef.khalil":   {"password": "123456", "doctor_id": 5},
    "mariam.adel":      {"password": "123456", "doctor_id": 6},
    "karim.fouad":      {"password": "123456", "doctor_id": 7},
}


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


@app.post("/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: pyodbc.Cursor = Depends(get_db),
):
    """Authenticate a doctor against DOCTOR_CREDENTIALS + the real Doctor table."""
    creds = DOCTOR_CREDENTIALS.get(username.strip().lower())
    if not creds or creds["password"] != password:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_credentials", "message": "Invalid username or password."},
        )

    db.execute(
        """
        SELECT DoctorID, FirstName, LastName, Specialization, Role
        FROM Doctor WHERE DoctorID = ?
        """,
        creds["doctor_id"],
    )
    row = db.fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "doctor_not_found", "message": "Doctor record missing in database."},
        )

    doctor_id, first_name, last_name, specialization, role = row
    is_head = (role or "").strip().lower() == "head doctor"

    return {
        "username": username.strip().lower(),
        "display_name": f"Dr. {first_name} {last_name}",
        "role": "head" if is_head else "doctor",
        "physician_name": f"{first_name} {last_name}",
        "doctor_id": doctor_id,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(..., description="Brain MRI image (JPEG/PNG)")):
    """
    Upload an MRI image → get tumor classification.

    Returns JSON:
    {
        "prediction":     "glioma" | "meningioma" | "pituitary",
        "display_name":   "Glioma" | "Meningioma" | "Pituitary Tumor",
        "arabic_name":    "ورم دبقي (Glioma)",
        "confidence":     0.9823,
        "confidence_pct": 98.23,
        "is_tumor":       true,
        "severity":       "high" | "medium",
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


@app.get("/patients")
def get_patients(doctor_id: int | None = None, db: pyodbc.Cursor = Depends(get_db)):
    """List patients joined with their diagnosis and doctor info.

    If `doctor_id` is provided as a query param, only that doctor's patients
    are returned (used by regular doctors). Head Doctor omits it to see all.
    """
    query = """
    SELECT
        p.PatientID,
        p.FirstName,
        p.LastName,
        p.Age,
        p.Gender,
        d.TumorType,
        d.ConfidenceScore,
        d.DiagnosisDate,
        doc.FirstName + ' ' + doc.LastName AS DoctorName,
        p.DoctorID
    FROM Patient p
    JOIN Diagnosis d
        ON p.PatientID = d.PatientID
    JOIN Doctor doc
        ON p.DoctorID = doc.DoctorID
    """
    params = []
    if doctor_id is not None:
        query += " WHERE p.DoctorID = ?"
        params.append(doctor_id)

    db.execute(query, *params)
    rows = db.fetchall()
    columns = [column[0] for column in db.description]

    return [dict(zip(columns, row)) for row in rows]


@app.get("/patients/{patient_id}")
def get_patient_detail(
    patient_id: int,
    doctor_id: int | None = None,
    db: pyodbc.Cursor = Depends(get_db),
):
    """Full record for a single patient, including all MRI scans/diagnoses.

    If `doctor_id` is provided, access is restricted to that doctor's own
    patient — used by regular doctors. Head Doctor omits it to see anyone.
    """
    # 1. Confirm the patient exists and fetch their assigned DoctorID
    db.execute(
        "SELECT PatientID, FirstName, LastName, Age, Gender, DoctorID FROM Patient WHERE PatientID = ?",
        patient_id,
    )
    patient_row = db.fetchone()
    if patient_row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "patient_not_found", "message": "Patient not found."},
        )

    p_id, first_name, last_name, age, gender, assigned_doctor_id = patient_row

    # 2. Access control: a regular doctor can only view their own patients
    if doctor_id is not None and assigned_doctor_id != doctor_id:
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "message": "You do not have access to this patient's records."},
        )

    # 3. Fetch all diagnoses/scans for this patient, most recent first
    db.execute(
        """
        SELECT
            d.DiagnosisID,
            d.Result,
            d.TumorType,
            d.ConfidenceScore,
            d.MRIImagePath,
            d.Report,
            d.DiagnosisDate,
            doc.FirstName + ' ' + doc.LastName AS DoctorName
        FROM Diagnosis d
        JOIN Doctor doc ON doc.DoctorID = ?
        WHERE d.PatientID = ?
        ORDER BY d.DiagnosisDate DESC
        """,
        assigned_doctor_id,
        patient_id,
    )
    rows = db.fetchall()
    columns = [c[0] for c in db.description]
    diagnoses = [dict(zip(columns, row)) for row in rows]

    return {
        "PatientID": p_id,
        "FirstName": first_name,
        "LastName": last_name,
        "Age": age,
        "Gender": gender,
        "DoctorID": assigned_doctor_id,
        "diagnoses": diagnoses,
    }