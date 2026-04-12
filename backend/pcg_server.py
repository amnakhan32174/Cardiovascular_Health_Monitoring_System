#!/usr/bin/env python3
"""
PCG (Phonocardiogram) Heart Sound Classification Server
Classifies heart sounds into: AS, MR, MS, MVP, N (Normal)
Uses MFCC features extracted from WAV audio - matches training pipeline exactly.

Training pipeline (from notebook):
  1. librosa.load(file, sr=None, duration=3.0)
  2. librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=13)  -> shape (13, n_frames)
  3. np.expand_dims(mfccs, axis=3)                      -> shape (13, n_frames, 1)
  4. Conv1D model input_shape = (13, n_frames, 1)

IMPORTANT: LabelEncoder.fit_transform on ["AS","MR","MS","MVP","N"] gives:
  AS=0, MR=1, MS=2, MVP=3, N=4  (alphabetical order)
"""

import os
import json
import numpy as np
import librosa
import librosa.feature
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(title="PCG Heart Sound Classification API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Configuration (must match training notebook exactly) ──────────────────────
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "model_fold_5 (3).h5")
CLASSES_PATH = os.path.join(os.path.dirname(__file__), "pcg_classes.json")
DATA_DIR     = os.path.join(os.path.dirname(__file__), "data")

DURATION_SEC = 3.0   # training used duration=3.0
N_MFCC       = 13    # training used n_mfcc=13

# LabelEncoder on sorted unique labels ["AS","MR","MS","MVP","N"] → alphabetical
DEFAULT_CLASSES = ["AS", "MR", "MS", "MVP", "N"]

# ── Load label classes ────────────────────────────────────────────────────────
label_classes = DEFAULT_CLASSES
if os.path.exists(CLASSES_PATH):
    with open(CLASSES_PATH, "r") as f:
        data = json.load(f)
        label_classes = data.get("classes", DEFAULT_CLASSES)
    print(f"✅ Loaded {len(label_classes)} classes: {label_classes}")
else:
    print(f"⚠️  pcg_classes.json not found, using defaults: {label_classes}")

NUM_CLASSES = len(label_classes)

# ── Load model ────────────────────────────────────────────────────────────────
model = None

def _load_model():
    """Try multiple loaders for legacy Keras .h5 files."""
    errors = []

    # Preferred: tf_keras (Keras 2 standalone) — avoids TFOpLambda issues
    try:
        from tf_keras.models import load_model
        m = load_model(MODEL_PATH)
        return m, "tf_keras"
    except ImportError:
        errors.append("tf_keras not installed (pip install tf-keras)")
    except Exception as e:
        errors.append(f"tf_keras: {e}")

    # Fallback: tensorflow.keras with safe_mode=False
    try:
        import tensorflow as tf
        m = tf.keras.models.load_model(MODEL_PATH, safe_mode=False)
        return m, "tensorflow.keras"
    except Exception as e:
        errors.append(f"tensorflow.keras: {e}")

    raise RuntimeError(
        "Could not load model. Run: pip install tf-keras\n" + "\n".join(errors)
    )

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}\n"
        f"Make sure 'model_fold_5 (3).h5' is in the backend folder."
    )

model, loader_used = _load_model()
print(f"✅ PCG model loaded via [{loader_used}]")
print(f"   Input shape : {model.input_shape}")
print(f"   Output shape: {model.output_shape}")

# Validate output matches number of classes
model_out_classes = model.output_shape[-1]
if model_out_classes != NUM_CLASSES:
    print(f"⚠️  WARNING: Model outputs {model_out_classes} classes but "
          f"pcg_classes.json has {NUM_CLASSES}. "
          f"Update pcg_classes.json to match exactly {model_out_classes} classes.")

# Derive expected MFCC frame count from model input shape
# model.input_shape = (None, 13, n_frames, 1)
EXPECTED_FRAMES = model.input_shape[2]
print(f"   Expected MFCC frames: {EXPECTED_FRAMES}")


# ── Preprocessing ─────────────────────────────────────────────────────────────
def extract_mfcc_from_signal(signal: np.ndarray, sr: int) -> np.ndarray:
    """
    Extract MFCC features from a raw audio signal.
    Matches training pipeline exactly:
      mfccs = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=13)  → (13, n_frames)
      then expand_dims → (13, n_frames, 1)

    Returns array of shape (1, 13, EXPECTED_FRAMES, 1) ready for model.predict()
    """
    signal = np.array(signal, dtype=np.float32)
    if signal.ndim > 1:
        signal = signal.flatten()

    # Truncate or pad to exactly 3 seconds (matches training duration=3.0)
    target_len = int(sr * DURATION_SEC)
    if len(signal) < target_len:
        signal = np.pad(signal, (0, target_len - len(signal)), mode="edge")
    else:
        signal = signal[:target_len]

    # Extract MFCCs — exactly as in training
    mfccs = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=N_MFCC)
    # mfccs shape: (13, n_frames)

    # Pad or truncate time frames to match model's expected input
    if mfccs.shape[1] < EXPECTED_FRAMES:
        pad_width = ((0, 0), (0, EXPECTED_FRAMES - mfccs.shape[1]))
        mfccs = np.pad(mfccs, pad_width, mode="edge")
    else:
        mfccs = mfccs[:, :EXPECTED_FRAMES]
    # mfccs shape now: (13, EXPECTED_FRAMES)

    # Match training reshape: expand_dims(mfccs, axis=3) on a batch
    # Training: train_data_mfccs shape = (samples, 13, n_frames, 1)
    # So single sample: (13, EXPECTED_FRAMES) → (1, 13, EXPECTED_FRAMES, 1)
    x = mfccs[np.newaxis, :, :, np.newaxis]   # (1, 13, EXPECTED_FRAMES, 1)
    return x.astype(np.float32)


def load_wav_and_predict(wav_path: str) -> dict:
    """
    Load a WAV file and run prediction. Matches training exactly:
      librosa.load(file, sr=None, duration=3.0)
    """
    if not os.path.exists(wav_path):
        raise FileNotFoundError(f"WAV file not found: {wav_path}")

    # sr=None preserves native sample rate (critical — matches training)
    signal, sr = librosa.load(wav_path, sr=None, duration=DURATION_SEC)
    signal = signal.astype(np.float32)

    print(f"   Loaded: {os.path.basename(wav_path)} | sr={sr} | samples={len(signal)}")

    x = extract_mfcc_from_signal(signal, sr)
    preds = model.predict(x, verbose=0)

    class_idx  = int(np.argmax(preds[0]))
    confidence = float(preds[0][class_idx])
    label      = label_classes[class_idx] if class_idx < len(label_classes) else f"Class_{class_idx}"

    return {
        "heart_sound_type": label,
        "class_index": class_idx,
        "confidence": round(confidence, 4),
        "all_probabilities": {
            label_classes[i]: round(float(preds[0][i]), 4)
            for i in range(len(preds[0]))
        },
        "sample_rate": sr,
        "signal_length": len(signal),
    }


# ── Pydantic models ───────────────────────────────────────────────────────────
class WavPredictRequest(BaseModel):
    """Predict from a WAV filename in the data/ folder."""
    filename: str  # e.g. "156_AS.wav"

class SignalPredictRequest(BaseModel):
    """
    Predict from raw PCG signal samples (future: live microphone streaming).
    IMPORTANT: This must be actual heart sound audio, NOT ECG data.
    sample_rate is required for correct MFCC extraction.
    """
    pcg: List[float]
    sample_rate: Optional[int] = 2000  # provide actual sr from your sensor

class PredictionResponse(BaseModel):
    heart_sound_type: str
    class_index: int
    confidence: float
    status: str
    details: dict = {}


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "PCG Heart Sound Classification API",
        "status": "running",
        "model": "Conv1D (Keras)",
        "classes": label_classes,
        "input_shape": str(model.input_shape),
        "endpoints": {
            "predict_wav": "POST /predict  { filename: '156_AS.wav' }",
            "predict_signal": "POST /predict-signal  { pcg: [...], sample_rate: 2000 }",
            "list_files": "GET /data-files",
            "test_accuracy": "GET /test-with-labels",
            "health": "GET /health",
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "classes": label_classes,
        "num_classes": NUM_CLASSES,
        "expected_frames": EXPECTED_FRAMES,
    }


@app.get("/data-files")
async def list_data_files():
    """List all available WAV files in the data/ folder."""
    if not os.path.exists(DATA_DIR):
        return {"files": [], "count": 0, "error": "data/ folder not found"}

    files = sorted([
        f for f in os.listdir(DATA_DIR)
        if f.lower().endswith(".wav")
    ])
    return {"files": files, "count": len(files)}


@app.post("/predict", response_model=PredictionResponse)
async def predict_from_wav(request: WavPredictRequest):
    """
    PRIMARY ENDPOINT — predict heart sound type from a WAV file.
    Called by Node.js backend with a filename from the data/ folder.

    Example body: { "filename": "156_AS.wav" }
    """
    try:
        filename = os.path.basename(request.filename)  # strip any path traversal
        wav_path = os.path.join(DATA_DIR, filename)

        print(f"\n📥 /predict request: {filename}")

        result = load_wav_and_predict(wav_path)

        print(f"✅ Predicted: {result['heart_sound_type']} "
              f"(confidence={result['confidence']:.3f})")

        return PredictionResponse(
            heart_sound_type=result["heart_sound_type"],
            class_index=result["class_index"],
            confidence=result["confidence"],
            status="success",
            details={
                "filename": filename,
                "sample_rate": result["sample_rate"],
                "signal_length": result["signal_length"],
                "all_probabilities": result["all_probabilities"],
            }
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-signal", response_model=PredictionResponse)
async def predict_from_signal(request: SignalPredictRequest):
    """
    FUTURE ENDPOINT — predict from raw PCG signal array (live microphone).
    Use this ONLY with actual heart sound audio data, NOT with ECG signals.
    The sample_rate MUST match the actual recording sample rate.
    """
    try:
        if len(request.pcg) < 100:
            raise HTTPException(
                status_code=400,
                detail="Need at least 100 PCG samples. "
                       "Also ensure this is heart sound audio, not ECG data."
            )

        signal = np.array(request.pcg, dtype=np.float32)
        sr = request.sample_rate or 2000

        print(f"\n📥 /predict-signal: {len(signal)} samples @ {sr} Hz")

        x     = extract_mfcc_from_signal(signal, sr)
        preds = model.predict(x, verbose=0)

        class_idx  = int(np.argmax(preds[0]))
        confidence = float(preds[0][class_idx])
        label      = (label_classes[class_idx]
                      if class_idx < len(label_classes)
                      else f"Class_{class_idx}")

        print(f"✅ Predicted: {label} (confidence={confidence:.3f})")

        return PredictionResponse(
            heart_sound_type=label,
            class_index=class_idx,
            confidence=confidence,
            status="success",
            details={
                "input_samples": len(signal),
                "sample_rate": sr,
                "all_probabilities": {
                    label_classes[i]: round(float(preds[0][i]), 4)
                    for i in range(len(preds[0]))
                },
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test-with-labels")
async def test_with_labels():
    """
    Run model on all WAV files in data/ and check predictions against
    the label encoded in each filename (e.g. 156_AS.wav → label AS).
    No TestLabel.xlsx required — label is parsed from filename.
    """
    if not os.path.exists(DATA_DIR):
        raise HTTPException(status_code=404, detail="data/ folder not found")

    wav_files = sorted([
        f for f in os.listdir(DATA_DIR)
        if f.lower().endswith(".wav")
    ])

    if not wav_files:
        return {
            "status": "no_data",
            "message": "No WAV files found in data/",
            "results": [],
            "summary": {"total": 0, "correct": 0, "accuracy": 0},
        }

    results = []
    for fname in wav_files:
        # Parse label from filename: "156_AS.wav" → "AS"
        actual_label = None
        parts = os.path.splitext(fname)[0].split("_")
        if len(parts) >= 2:
            actual_label = parts[-1].upper()

        wav_path = os.path.join(DATA_DIR, fname)
        try:
            result      = load_wav_and_predict(wav_path)
            pred_label  = result["heart_sound_type"]
            confidence  = result["confidence"]
            match       = (pred_label.upper() == actual_label) if actual_label else None

            results.append({
                "filename":        fname,
                "actual_label":    actual_label,
                "predicted_label": pred_label,
                "confidence":      confidence,
                "match":           match,
                "all_probs":       result["all_probabilities"],
                "error":           None,
            })
        except Exception as e:
            results.append({
                "filename":        fname,
                "actual_label":    actual_label,
                "predicted_label": None,
                "confidence":      None,
                "match":           None,
                "all_probs":       None,
                "error":           str(e),
            })

    correct  = sum(1 for r in results if r["match"] is True)
    total    = sum(1 for r in results if r["error"] is None)
    accuracy = round(correct / total * 100, 2) if total > 0 else 0

    # Per-class breakdown
    class_stats = {}
    for cls in label_classes:
        cls_results = [r for r in results if r["actual_label"] == cls and r["error"] is None]
        cls_correct = sum(1 for r in cls_results if r["match"])
        class_stats[cls] = {
            "total":    len(cls_results),
            "correct":  cls_correct,
            "accuracy": round(cls_correct / len(cls_results) * 100, 2) if cls_results else 0,
        }

    return {
        "status":        "success",
        "results":       results,
        "class_breakdown": class_stats,
        "summary": {
            "total":    total,
            "correct":  correct,
            "accuracy": accuracy,
        },
    }


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🚀 PCG Heart Sound Classification Server")
    print("=" * 70)
    print(f"📍 Server  : http://0.0.0.0:5002")
    print(f"📖 API docs: http://localhost:5002/docs")
    print(f"🔧 Model   : {MODEL_PATH}")
    print(f"🏷️  Classes : {label_classes}")
    print(f"📁 Data dir: {DATA_DIR}")
    print("=" * 70 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=5002, log_level="info")