# Quick Start Guide - Cardio Dashboard Backend

## Overview

This guide will help you get the Cardio Dashboard backend up and running with the new persistent storage and doctor reporting features.

---

## Prerequisites

- Node.js v14+ installed
- Python 3.8+ installed (for ML service)
- npm or yarn package manager

---

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

All required dependencies are already in `package.json`:
- express, socket.io, cors, dotenv, axios
- lowdb (for database)

### 2. Install Python ML Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Required packages:
- fastapi, uvicorn, torch, numpy, pydantic

---

## Configuration

### 3. Configure Environment Variables

The `.env` file is already configured, but verify these settings:

```bash
# backend/.env
PORT=5000
ML_MODEL_URL=http://localhost:5001/predict
```

Optional (for email reports):
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=cardio-monitor@yourdomain.com
```

---

## Starting the Server

### 4. Start ML Service (Optional but Recommended)

In one terminal:
```bash
cd backend
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:5001
INFO:     Application startup complete.
```

**Note:** If ML service is not running, the system will still work but BP predictions will be unavailable (sbp/dbp will be null).

### 5. Start Backend Server

In another terminal:
```bash
cd backend
npm start
```

You should see:
```
✅ Database initialized at: /path/to/backend/db/vitals.json
✅ Backend running on http://0.0.0.0:5000
📡 Socket.IO ready for connections
🤖 ML Model URL: http://localhost:5001/predict
```

---

## Verification

### 6. Test the Server

#### Option A: Run Automated Tests

```bash
cd backend
node test-api.js
```

This will test all endpoints and show results.

#### Option B: Manual Testing with cURL

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

**Send a Test Reading:**
```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "hr": 75,
    "spo2": 98,
    "ecg": [0.5, 0.6, 0.4],
    "ppg": [200, 185, 190]
  }'
```

**Get Recent Vitals:**
```bash
curl http://localhost:5000/api/vitals/recent?minutes=5
```

**Generate Doctor Report:**
```bash
curl -X POST http://localhost:5000/api/vitals/send-to-doctor \
  -H "Content-Type: application/json" \
  -d '{
    "minutes": 5,
    "format": "json"
  }'
```

**Get Statistics:**
```bash
curl http://localhost:5000/api/vitals/stats
```

---

## Database Location

### 7. Check Database File

After sending readings, verify the database was created:

```bash
# Windows
type backend\db\vitals.json

# Linux/Mac
cat backend/db/vitals.json
```

You should see your readings stored in JSON format.

---

## ESP32 Setup

### 8. Configure ESP32 to Send Data

Update your ESP32 code with the backend URL:

```cpp
const char* SERVER_URL = "http://YOUR_COMPUTER_IP:5000";
```

Example:
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000";
```

The ESP32 will automatically send data to `POST /api/readings`, which will:
1. Validate the data
2. Predict BP using ML
3. Save to database
4. Broadcast to frontend via Socket.IO

---

## Frontend Connection

### 9. Start Frontend (if applicable)

The frontend should already be configured to connect to the backend via Socket.IO.

```bash
cd frontend
npm install
npm run dev
```

The frontend will:
- Receive real-time vitals via Socket.IO
- Display current readings
- (Optionally) fetch historical data from `/api/vitals/recent`

---

## Typical Workflow

### Full System Running:

1. **ML Service** (Terminal 1):
   ```bash
   cd backend && python main.py
   ```
   Status: Running on port 5001

2. **Backend Server** (Terminal 2):
   ```bash
   cd backend && npm start
   ```
   Status: Running on port 5000

3. **Frontend** (Terminal 3):
   ```bash
   cd frontend && npm run dev
   ```
   Status: Running on port 5173 (or configured port)

4. **ESP32**:
   - Powered on and connected to WiFi
   - Sending data to backend every 3-5 seconds

---

## Common Use Cases

### Generate a Medical Report

```bash
# Get last 5 minutes of data as JSON
curl -X POST http://localhost:5000/api/vitals/send-to-doctor \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "esp32-device",
    "minutes": 5,
    "format": "json"
  }'

# Get last 10 minutes as text report
curl -X POST http://localhost:5000/api/vitals/send-to-doctor \
  -H "Content-Type: application/json" \
  -d '{
    "minutes": 10,
    "format": "pdf"
  }'
```

The report will include:
- Time range
- Total readings count
- Statistical summary (avg, min, max for HR, SpO2, BP)
- Individual readings
- Medical disclaimers

### Query Historical Data

```bash
# Last 5 minutes
curl http://localhost:5000/api/vitals/recent?minutes=5

# Last 30 minutes for specific device
curl http://localhost:5000/api/vitals/recent?minutes=30&deviceId=esp32-device-001

# Last hour
curl http://localhost:5000/api/vitals/recent?minutes=60
```

### Check System Status

```bash
# Health check
curl http://localhost:5000/api/health

# Database statistics
curl http://localhost:5000/api/vitals/stats
```

---

## Troubleshooting

### Issue: "Database initialization failed"

**Cause:** No write permissions  
**Solution:**
```bash
cd backend
mkdir -p db
chmod 755 db
```

### Issue: "BP prediction unavailable"

**Cause:** ML service not running  
**Solution:**
```bash
cd backend
python main.py
```

Verify at: http://localhost:5001/health

### Issue: "Cannot connect to backend"

**Cause:** Port already in use or firewall  
**Solution:**
```bash
# Check if port 5000 is in use
netstat -an | grep 5000

# Change port in .env
PORT=5001
```

### Issue: ESP32 can't connect

**Cause:** IP address or firewall  
**Solution:**
1. Find your computer's IP:
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   ```

2. Update ESP32 with correct IP
3. Ensure firewall allows port 5000

### Issue: "No readings in database"

**Cause:** Database save failing silently  
**Solution:**
Check console logs for errors:
```bash
cd backend
npm start
# Look for "❌ Database save failed" messages
```

---

## Next Steps

### Enhance Your System:

1. **Add Frontend Features:**
   - History view component
   - "Send to Doctor" button
   - Stats dashboard

2. **Configure Email:**
   - Set up SMTP credentials in `.env`
   - Test email delivery

3. **Set Up Production:**
   - Add authentication
   - Configure data retention policy
   - Set up monitoring

4. **Optimize Performance:**
   - Add database indexing
   - Implement caching
   - Add rate limiting

---

## Resources

- **API Documentation:** `API_DOCUMENTATION.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Test Script:** `test-api.js`
- **ESP32 Guides:** `../esp32/SETUP_GUIDE.md`

---

## Support

### Useful Commands:

```bash
# View database contents
cat backend/db/vitals.json | jq .

# Count total readings
cat backend/db/vitals.json | jq '.vitals | length'

# View latest reading
cat backend/db/vitals.json | jq '.vitals[-1]'

# Check disk space
df -h

# Monitor server logs
cd backend && npm start | tee server.log
```

---

## Success Checklist

✅ Backend server running on port 5000  
✅ ML service running on port 5001 (optional)  
✅ Database file created at `backend/db/vitals.json`  
✅ Health check returns "ok"  
✅ Test reading successfully stored  
✅ Recent vitals endpoint returns data  
✅ Report generation works  
✅ ESP32 can send data (if connected)  
✅ Frontend receives real-time updates (if running)  

---

**You're all set! 🎉**

Your Cardio Dashboard backend is now running with:
- ✅ Persistent database storage
- ✅ Historical data retrieval
- ✅ Medical report generation
- ✅ Real-time Socket.IO broadcasting
- ✅ ML-based BP prediction
- ✅ Input validation
- ✅ Comprehensive error handling

Start sending data from your ESP32 or test with the provided scripts!
