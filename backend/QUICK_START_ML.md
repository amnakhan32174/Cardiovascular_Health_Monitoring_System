# Quick Start: ML Model Integration

## Step 1: Get Your Google Colab Model URL

1. In your Google Colab notebook, expose your model using ngrok or Flask:

```python
# Install ngrok
!pip install pyngrok flask flask-cors

# Create Flask app
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['data']
    
    # Your prediction code here
    # features = [data['heart_rate'], data['systolic_bp'], ...]
    # prediction = your_model.predict([features])
    
    return jsonify({
        'prediction': 1,  # 1 = disease, 0 = normal
        'probability': 0.85,
        'disease': 'Cardiovascular Disease'
    })

# Expose with ngrok
public_url = ngrok.connect(5000)
print(f"✅ Your ML Model URL: {public_url}/predict")
print(f"📝 Copy this URL and update ML_MODEL_URL in backend/.env")

app.run(host='0.0.0.0', port=5000)
```

2. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

## Step 2: Configure Backend

1. Create `.env` file in `backend/` directory:
```bash
cd backend
# Copy the example
cp .env.example .env
```

2. Edit `.env` and add your ML model URL:
```
ML_MODEL_URL=https://your-ngrok-url.ngrok.io/predict
```

3. Install dotenv (optional but recommended):
```bash
npm install dotenv
```

## Step 3: Test the Integration

### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```

Should show your ML model URL.

### Test 2: Direct Prediction
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

### Test 3: With Sensor Data
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

The response will include `mlPrediction` field with disease prediction.

## Step 4: Frontend Integration

The ML predictions are automatically included in sensor readings. The frontend will receive:

```javascript
{
  data: {
    hr: 85,
    sbp: 140,
    mlPrediction: {
      disease: "Cardiovascular Disease",
      probability: 0.85,
      riskLevel: "High",
      confidence: 0.85
    }
  }
}
```

## Troubleshooting

**ML Model Not Responding?**
- Check if Colab notebook is still running
- Verify ngrok URL (it changes on restart)
- Check backend logs: `console.log` will show ML errors

**Wrong Response Format?**
- Check `backend/services/mlService.js`
- Update `formatPredictionResponse()` to match your model's output

**Need to Customize Input Format?**
- Edit `prepareMLInput()` in `backend/services/mlService.js`

## That's It! 🎉

Your ML model is now integrated. Every sensor reading will automatically get a disease prediction!
