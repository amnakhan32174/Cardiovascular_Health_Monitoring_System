# ECG Classification Model Integration Guide

This guide explains how to integrate your ECG classification model from Google Colab with the backend.

## Model URL
Your model: https://colab.research.google.com/github/simonsanvil/ECG-classification-MLH/blob/master/notebooks/Andres_ECG.ipynb

## Step 1: Expose Your ECG Model from Colab

### Option A: Using Flask + ngrok (Recommended)

Add this code to your Colab notebook:

```python
!pip install flask flask-cors pyngrok

from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
import numpy as np

app = Flask(__name__)
CORS(app)

# Load your ECG model (adjust based on your notebook)
# model = your_loaded_model_here

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # Extract ECG signal
        # Format 1: Direct array
        if isinstance(data, list):
            ecg_signal = np.array(data)
        # Format 2: Nested in 'ecg_signal' key
        elif 'ecg_signal' in data:
            ecg_signal = np.array(data['ecg_signal'])
        # Format 3: Nested in 'data' key
        elif 'data' in data and 'ecg_signal' in data['data']:
            ecg_signal = np.array(data['data']['ecg_signal'])
        else:
            return jsonify({'error': 'ECG signal not found'}), 400
        
        # Preprocess ECG signal (adjust based on your model's requirements)
        # - Reshape if needed
        # - Normalize if needed
        # - Apply any filters
        
        # Example preprocessing:
        # ecg_signal = ecg_signal.reshape(1, -1)  # Reshape for your model
        # ecg_signal = (ecg_signal - np.mean(ecg_signal)) / np.std(ecg_signal)  # Normalize
        
        # Make prediction
        prediction = model.predict(ecg_signal)
        probabilities = model.predict_proba(ecg_signal)[0] if hasattr(model, 'predict_proba') else None
        
        # Map class indices to labels
        class_labels = ['Normal', 'Arrhythmia', 'Myocardial Infarction']  # Adjust based on your model
        predicted_class = int(prediction[0]) if isinstance(prediction, np.ndarray) else int(prediction)
        predicted_label = class_labels[predicted_class] if predicted_class < len(class_labels) else f'Class {predicted_class}'
        
        # Get probability/confidence
        confidence = float(probabilities[predicted_class]) if probabilities is not None else 0.5
        
        return jsonify({
            'prediction': predicted_class,
            'class': predicted_class,
            'class_label': predicted_label,
            'label': predicted_label,
            'disease': predicted_label,
            'probability': confidence,
            'confidence': confidence,
            'probabilities': probabilities.tolist() if probabilities is not None else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Expose with ngrok
public_url = ngrok.connect(5000)
print(f"✅ ECG Model URL: {public_url}/predict")
print(f"📝 Copy this URL and update ML_MODEL_URL in backend/.env")

app.run(host='0.0.0.0', port=5000)
```

### Option B: Using FastAPI (Alternative)

```python
!pip install fastapi uvicorn pyngrok python-multipart

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict(data: dict):
    ecg_signal = np.array(data.get('ecg_signal', data.get('data', [])))
    
    # Your prediction code
    prediction = model.predict(ecg_signal.reshape(1, -1))
    
    return {
        "prediction": int(prediction[0]),
        "label": class_labels[int(prediction[0])],
        "probability": 0.85
    }

public_url = ngrok.connect(8000)
print(f"✅ ECG Model URL: {public_url}/predict")

import uvicorn
uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Step 2: Configure Backend

1. Create/update `backend/.env`:
```
ML_MODEL_URL=https://your-ngrok-url.ngrok.io/predict
```

2. The backend will automatically:
   - Extract ECG data from sensor readings
   - Format it for your model
   - Parse the classification results
   - Return standardized predictions

## Step 3: Expected Data Formats

### Input to Your Model

The backend sends ECG data in this format:

```json
{
  "ecg_signal": [0.1, 0.2, 0.15, ...]  // Array of voltage values
}
```

Or if your model expects nested format:

```json
{
  "data": {
    "ecg_signal": [0.1, 0.2, 0.15, ...]
  }
}
```

### Output from Your Model

Your model should return one of these formats:

**Format 1 (Recommended):**
```json
{
  "prediction": 1,
  "class": 1,
  "class_label": "Arrhythmia",
  "label": "Arrhythmia",
  "disease": "Arrhythmia",
  "probability": 0.85,
  "confidence": 0.85
}
```

**Format 2:**
```json
{
  "class": 1,
  "confidence": 0.92,
  "disease": "Arrhythmia"
}
```

**Format 3:**
```json
{
  "label": "Arrhythmia",
  "probability": 0.85
}
```

## Step 4: Testing

### Test with ECG Data

```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ecg_data": [0.1, 0.2, 0.15, 0.3, 0.25, ...]
  }'
```

### Test with Full Sensor Data

```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "hr": 85,
    "sbp": 140,
    "dbp": 90,
    "spo2": 95,
    "ecg_data": [0.1, 0.2, 0.15, 0.3, 0.25, ...]
  }'
```

## Step 5: Customizing Input Format

If your model expects a different input format, edit `backend/services/mlService.js`:

1. **Change ECG extraction** - Modify `prepareMLInput()` function
2. **Change request format** - Modify the `requestPayload` in `getMLPrediction()`

Example for models expecting reshaped data:

```javascript
// In getMLPrediction function
if (isECGPrediction) {
  requestPayload = {
    ecg_signal: mlInput.ecg_signal,
    shape: [1, mlInput.ecg_signal.length],  // Add shape info
    sample_rate: 250  // Add sampling rate
  };
}
```

## Common ECG Model Requirements

### 1. Signal Length
- Most models expect fixed-length signals (e.g., 1000 samples)
- If your signal is shorter/longer, pad or truncate in Colab

### 2. Normalization
- Many models require normalized signals (mean=0, std=1)
- Add normalization in your Colab endpoint

### 3. Reshaping
- Some models expect 2D arrays: `(1, signal_length)`
- Handle reshaping in your Colab endpoint

### 4. Multiple Leads
- If using multi-lead ECG, send as nested arrays
- Update `prepareMLInput()` to handle multi-lead format

## Troubleshooting

### Model Not Receiving ECG Data
- Check backend logs for "Input summary"
- Verify `ecg_data` is being sent from frontend
- Check if ECG array is properly formatted

### Wrong Classification
- Verify class labels match your model's output
- Check `formatPredictionResponse()` mapping
- Review raw response in backend logs

### Timeout Errors
- ECG processing can be slow
- Increase `ML_REQUEST_TIMEOUT` in `mlService.js`
- Consider async processing for long signals

## Example Complete Colab Integration

```python
# Complete example for ECG classification
!pip install flask flask-cors pyngrok scikit-learn numpy

from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
import numpy as np
import pickle

app = Flask(__name__)
CORS(app)

# Load your model (adjust path)
# with open('ecg_model.pkl', 'rb') as f:
#     model = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    # Extract ECG signal
    ecg_signal = np.array(data.get('ecg_signal', []))
    
    if len(ecg_signal) == 0:
        return jsonify({'error': 'No ECG signal provided'}), 400
    
    # Preprocess
    # 1. Normalize
    ecg_signal = (ecg_signal - np.mean(ecg_signal)) / (np.std(ecg_signal) + 1e-8)
    
    # 2. Reshape for model (adjust based on your model)
    ecg_signal = ecg_signal.reshape(1, -1)
    
    # 3. Pad/truncate to expected length (if needed)
    # expected_length = 1000
    # if len(ecg_signal[0]) < expected_length:
    #     ecg_signal = np.pad(ecg_signal, ((0,0), (0, expected_length - len(ecg_signal[0]))))
    # elif len(ecg_signal[0]) > expected_length:
    #     ecg_signal = ecg_signal[:, :expected_length]
    
    # Predict
    prediction = model.predict(ecg_signal)[0]
    probabilities = model.predict_proba(ecg_signal)[0]
    
    # Map to labels
    class_labels = ['Normal', 'Arrhythmia', 'Myocardial Infarction']
    predicted_label = class_labels[int(prediction)]
    confidence = float(probabilities[int(prediction)])
    
    return jsonify({
        'prediction': int(prediction),
        'class': int(prediction),
        'class_label': predicted_label,
        'label': predicted_label,
        'disease': predicted_label,
        'probability': confidence,
        'confidence': confidence,
        'probabilities': probabilities.tolist()
    })

# Expose
public_url = ngrok.connect(5000)
print(f"✅ ECG Model URL: {public_url}/predict")
print(f"📝 Update ML_MODEL_URL in backend/.env to: {public_url}/predict")

app.run(host='0.0.0.0', port=5000)
```

## Next Steps

1. Run the Colab code to get your ngrok URL
2. Update `backend/.env` with the URL
3. Restart backend server
4. Send ECG data and check predictions!

The backend is already configured to handle ECG classification. Just provide your model URL! 🎉
