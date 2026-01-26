# ML Model Integration Guide

This guide explains how to integrate your Google Colab ML model with the backend.

## Setup Instructions

### 1. Expose Your Google Colab Model

Your Google Colab model needs to be accessible via HTTP. Here are common methods:

#### Option A: Using ngrok (Recommended for testing)

1. In your Google Colab notebook, install and run ngrok:
```python
!pip install pyngrok
from pyngrok import ngrok

# Create a tunnel to your Flask/FastAPI server
public_url = ngrok.connect(5000)
print(f"Public URL: {public_url}")
```

2. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

3. Update `ML_MODEL_URL` in your `.env` file:
```
ML_MODEL_URL=https://abc123.ngrok.io/predict
```

#### Option B: Using Flask/FastAPI in Colab

Example Flask server in Colab:
```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['data']
    
    # Your ML model prediction code here
    # prediction = your_model.predict([data['heart_rate'], data['systolic_bp'], ...])
    
    return jsonify({
        'prediction': prediction,
        'probability': confidence,
        'disease': 'Cardiovascular Disease' if prediction == 1 else 'Normal'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

### 2. Configure Backend

1. Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

2. Update the `.env` file with your ML model URL:
```
ML_MODEL_URL=https://your-ngrok-url.ngrok.io/predict
```

3. Install dependencies (if not already installed):
```bash
npm install
```

### 3. Expected ML Model API Format

Your ML model should accept POST requests with this format:

**Request:**
```json
{
  "data": {
    "heart_rate": 75,
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "spo2": 98,
    "blood_sugar": 95,
    "timestamp": "2026-01-23T10:00:00.000Z"
  }
}
```

**Response (Option 1 - Recommended):**
```json
{
  "prediction": 1,
  "probability": 0.85,
  "disease": "Cardiovascular Disease"
}
```

**Response (Option 2):**
```json
{
  "class": 1,
  "confidence": 0.92,
  "disease": "CVD"
}
```

**Response (Option 3):**
```json
{
  "result": {
    "disease": "Cardiovascular Disease",
    "risk_score": 0.75
  }
}
```

The backend will automatically handle different response formats.

### 4. Testing the Integration

#### Test the ML endpoint directly:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "hr": 85,
    "sbp": 140,
    "dbp": 90,
    "spo2": 95,
    "blood_sugar": 100
  }'
```

#### Test with sensor data:
```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "hr": 85,
    "sbp": 140,
    "dbp": 90,
    "spo2": 95
  }'
```

### 5. Frontend Integration

The ML predictions are automatically included when sensor data is sent to `/api/readings`. The response includes:

```json
{
  "message": "Reading received successfully",
  "data": {
    "hr": 85,
    "sbp": 140,
    "mlPrediction": {
      "disease": "Cardiovascular Disease",
      "probability": 0.85,
      "riskLevel": "High",
      "confidence": 0.85
    }
  },
  "prediction": {
    "disease": "Cardiovascular Disease",
    "probability": 0.85,
    "riskLevel": "High"
  }
}
```

### 6. Customizing Input/Output Format

If your model expects a different input format, edit `backend/services/mlService.js`:

1. **Change input format** - Modify `prepareMLInput()` function
2. **Change output parsing** - Modify `formatPredictionResponse()` function

### 7. Fallback Behavior

If the ML model is unavailable or returns an error:
- The system will use rule-based fallback predictions
- Sensor data will still be processed and broadcast
- Error will be logged but won't break the system

### 8. Production Deployment

For production:
1. Deploy your ML model to a proper hosting service (AWS, GCP, Heroku, etc.)
2. Update `ML_MODEL_URL` to point to your production endpoint
3. Add authentication if needed (update `mlService.js`)
4. Consider caching predictions to reduce API calls

## Troubleshooting

### ML Model Not Responding
- Check if your Colab notebook is running
- Verify ngrok URL is still active (ngrok URLs change on restart)
- Check browser console for CORS errors
- Verify the endpoint path matches (`/predict`)

### Wrong Prediction Format
- Check the console logs for the actual response format
- Update `formatPredictionResponse()` in `mlService.js` to match your format

### Timeout Errors
- Increase `ML_REQUEST_TIMEOUT` in `mlService.js`
- Check your model's response time
- Consider using async processing for slow models

## Example Google Colab Code

```python
# Install dependencies
!pip install flask flask-cors pyngrok

# Load your model
import pickle
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

# Create Flask app
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['data']
    
    # Extract features
    features = [
        data.get('heart_rate', 0),
        data.get('systolic_bp', 0),
        data.get('diastolic_bp', 0),
        data.get('spo2', 0),
        data.get('blood_sugar', 0)
    ]
    
    # Make prediction
    prediction = model.predict([features])[0]
    probability = model.predict_proba([features])[0][1]
    
    return jsonify({
        'prediction': int(prediction),
        'probability': float(probability),
        'disease': 'Cardiovascular Disease' if prediction == 1 else 'Normal'
    })

# Expose with ngrok
public_url = ngrok.connect(5000)
print(f"Public URL: {public_url}")
print(f"Update ML_MODEL_URL to: {public_url}/predict")

app.run(host='0.0.0.0', port=5000)
```

## Support

If you encounter issues:
1. Check backend logs for error messages
2. Verify your ML model URL is correct
3. Test the ML endpoint directly with curl/Postman
4. Check browser console for frontend errors
