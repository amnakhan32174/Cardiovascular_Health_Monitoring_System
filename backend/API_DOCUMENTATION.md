# Cardio Dashboard Backend API Documentation

## Overview

This document describes all available API endpoints for the Cardio Dashboard backend server.

**Base URL:** `http://localhost:5000`

---

## Table of Contents

1. [POST /api/readings](#post-apireadings) - Receive sensor data from ESP32
2. [GET /api/vitals/recent](#get-apivitalsrecent) - Get recent vitals
3. [POST /api/vitals/send-to-doctor](#post-apivitalssend-to-doctor) - Generate and send medical report
4. [GET /api/vitals/download/:filename](#get-apivitalsdownloadfilename) - Download report file
5. [GET /api/vitals/stats](#get-apivitalsstats) - Get database statistics
6. [GET /api/health](#get-apihealth) - Health check
7. [GET /api/predict-from-csv](#get-apipredict-from-csv) - Predict BP from CSV

---

## Endpoints

### POST /api/readings

**Description:** Receives sensor data from ESP32 device, processes it, predicts BP, stores in database, and broadcasts to connected clients via Socket.IO.

**Request Body:**
```json
{
  "deviceId": "esp32-device-001",
  "hr": 75,
  "spo2": 98,
  "ecg": [0.5, 0.6, 0.4, ...],
  "ppg": [200, 185, 190, ...]
}
```

**Parameters:**
- `deviceId` (string, optional): Unique device identifier (default: "esp32-device")
- `hr` (number, optional): Heart rate in BPM
- `spo2` (number, optional): SpO2 percentage (0-100)
- `ecg` (array, optional): ECG signal data
- `ppg` (array, optional): PPG signal data

**Response:**
```json
{
  "ok": true,
  "message": "Reading received and stored successfully",
  "data": {
    "deviceId": "esp32-device-001",
    "timestamp": "2026-02-11T10:30:00.000Z",
    "hr": 75,
    "spo2": 98,
    "sbp": 120,
    "dbp": 80,
    "mean_bp": 93.5,
    "ecg": [...],
    "ppg": [...],
    "blood_sugar": null
  },
  "warnings": []
}
```

**Features:**
- ✅ Server-generated timestamps
- ✅ Input validation with warnings
- ✅ ML-based BP prediction
- ✅ Database persistence
- ✅ Real-time Socket.IO broadcast
- ✅ Continues operation even if ML or DB fails

---

### GET /api/vitals/recent

**Description:** Retrieves vitals readings from the last N minutes for a specific device or all devices.

**Query Parameters:**
- `minutes` (number, optional): Number of minutes to look back (default: 5, max: 1440)
- `deviceId` (string, optional): Filter by specific device ID

**Examples:**
```
GET /api/vitals/recent
GET /api/vitals/recent?minutes=10
GET /api/vitals/recent?minutes=5&deviceId=esp32-device-001
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "time_range_minutes": 5,
    "device_id": "all",
    "count": 15,
    "vitals": [
      {
        "id": "reading_1707649800000_abc123",
        "deviceId": "esp32-device-001",
        "timestamp": "2026-02-11T10:30:00.000Z",
        "hr": 75,
        "spo2": 98,
        "sbp": 120,
        "dbp": 80,
        "mean_bp": 93.5,
        "ecg": [...],
        "ppg": [...],
        "savedAt": "2026-02-11T10:30:00.123Z"
      },
      ...
    ]
  }
}
```

**Features:**
- ✅ Time-based filtering
- ✅ Device-specific filtering
- ✅ Sorted by timestamp (newest first)
- ✅ Efficient querying

---

### POST /api/vitals/send-to-doctor

**Description:** Generates a medical report from recent vitals and exports it in various formats (JSON, text, or email).

**Request Body:**
```json
{
  "deviceId": "esp32-device-001",
  "minutes": 5,
  "format": "json",
  "email": "doctor@example.com"
}
```

**Parameters:**
- `deviceId` (string, optional): Filter by device ID
- `minutes` (number, optional): Time range in minutes (default: 5)
- `format` (string, optional): Export format - "json", "pdf", or "email" (default: "json")
- `email` (string, required if format="email"): Recipient email address

**Response (JSON format):**
```json
{
  "ok": true,
  "message": "Report generated successfully",
  "format": "json",
  "data": {
    "report_type": "vitals_summary",
    "generated_at": "2026-02-11T10:30:00.000Z",
    "device_id": "esp32-device-001",
    "time_range": {
      "start": "2026-02-11T10:25:00.000Z",
      "end": "2026-02-11T10:30:00.000Z",
      "duration_minutes": 5
    },
    "summary": {
      "total_readings": 15,
      "hr_avg": 75.2,
      "hr_min": 72,
      "hr_max": 78,
      "spo2_avg": 97.8,
      "spo2_min": 96,
      "spo2_max": 99,
      "sbp_avg": 120.5,
      "dbp_avg": 80.3
    },
    "readings": [...],
    "notes": [...]
  },
  "file": {
    "path": "/path/to/report.json",
    "download_url": "/api/vitals/download/vitals_report_device_2026-02-11.json"
  }
}
```

**Response (Email format - not configured):**
```json
{
  "ok": false,
  "message": "Email service not configured",
  "details": "To enable email, configure SMTP settings in environment variables",
  "fallback": {
    "action": "Report saved to file",
    "filepath": "/path/to/report.txt",
    "instructions": "You can manually email this file to the doctor"
  },
  "configuration_needed": {
    "env_variables": ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "FROM_EMAIL"],
    "example": {...}
  }
}
```

**Features:**
- ✅ Multiple export formats
- ✅ Statistical analysis (avg, min, max)
- ✅ Professional report formatting
- ✅ File download support
- ✅ Email placeholder (requires SMTP setup)
- ✅ Comprehensive error messages

---

### GET /api/vitals/download/:filename

**Description:** Downloads a generated report file.

**Parameters:**
- `filename` (string): Report filename (must match pattern: `vitals_report_*.json` or `vitals_report_*.txt`)

**Example:**
```
GET /api/vitals/download/vitals_report_device_2026-02-11T10-30-00.json
```

**Response:**
- File download with appropriate content type

**Security:**
- ✅ Filename validation to prevent directory traversal
- ✅ Only allows report files

---

### GET /api/vitals/stats

**Description:** Retrieves database statistics and metrics.

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalReadings": 1523,
    "last24Hours": 288,
    "lastHour": 12,
    "devices": 2,
    "deviceIds": ["esp32-device-001", "esp32-device-002"],
    "oldestReading": "2026-02-01T08:00:00.000Z",
    "newestReading": "2026-02-11T10:30:00.000Z"
  }
}
```

**Features:**
- ✅ Total reading count
- ✅ Recent activity metrics
- ✅ Device tracking
- ✅ Data range information

---

### GET /api/health

**Description:** Health check endpoint for monitoring backend status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T10:30:00.000Z",
  "mlModelUrl": "http://localhost:5001/predict",
  "database": {
    "connected": true,
    "totalReadings": 1523,
    "last24Hours": 288
  },
  "latestReading": {
    "deviceId": "esp32-device-001",
    "timestamp": "2026-02-11T10:30:00.000Z",
    "hr": 75,
    "spo2": 98
  }
}
```

**Status Values:**
- `ok`: All systems operational
- `degraded`: Database connection issues (but server still running)

---

### GET /api/predict-from-csv

**Description:** Demo endpoint that predicts BP from a pre-loaded CSV file (rec_93.csv).

**Response:**
```json
{
  "ok": true,
  "data": {
    "deviceId": "csv-rec-93",
    "timestamp": "2026-02-11T10:30:00.000Z",
    "mean_bp": 93.5
  }
}
```

---

## WebSocket Events (Socket.IO)

### Server → Client Events

**Event:** `new_reading` / `newReading`

**Payload:**
```json
{
  "deviceId": "esp32-device-001",
  "timestamp": "2026-02-11T10:30:00.000Z",
  "hr": 75,
  "spo2": 98,
  "sbp": 120,
  "dbp": 80,
  "ecg": [...],
  "ppg": [...],
  "blood_sugar": null
}
```

**Description:** Broadcast to all connected clients whenever new sensor data is received.

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "ok": false,
  "error": "Brief error message",
  "details": "More detailed explanation of what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found (no data available)
- `500` - Internal Server Error

---

## Data Persistence

### Database Schema

Each vitals reading is stored with the following structure:

```javascript
{
  id: "reading_1707649800000_abc123",       // Auto-generated unique ID
  deviceId: "esp32-device-001",             // Device identifier
  timestamp: "2026-02-11T10:30:00.000Z",    // Server-generated ISO timestamp
  hr: 75,                                    // Heart rate (BPM)
  spo2: 98,                                  // SpO2 percentage
  sbp: 120,                                  // Systolic BP (predicted)
  dbp: 80,                                   // Diastolic BP (predicted)
  mean_bp: 93.5,                             // Mean arterial pressure
  blood_sugar: null,                         // Blood sugar (not from ESP32)
  ecg: [...],                                // ECG array (null if empty)
  ppg: [...],                                // PPG array (null if empty)
  savedAt: "2026-02-11T10:30:00.123Z"       // Database save timestamp
}
```

### Features:
- ✅ Persistent storage using lowdb (JSON file)
- ✅ Continuous storage without overwriting
- ✅ Optimized for time-series queries
- ✅ Automatic indexing by timestamp
- ✅ No data loss between restarts

### Database Location:
`backend/db/vitals.json`

---

## Configuration

### Environment Variables (.env)

```bash
# Server Configuration
PORT=5000

# ML Model Configuration
ML_MODEL_URL=http://localhost:5001/predict

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=cardio-monitor@yourdomain.com
```

---

## Validation Rules

### Sensor Readings
- Heart Rate: 0-300 BPM (warning if outside range)
- SpO2: 0-100% (warning if outside range)
- Systolic BP: 50-250 mmHg (warning if outside range)
- Diastolic BP: 30-150 mmHg (warning if outside range)
- ECG/PPG arrays: Max 1000 samples recommended

### Query Parameters
- Minutes: 1-1440 (max 24 hours)
- DeviceId: String validation

---

## Testing Examples

### Using cURL

```bash
# Send sensor reading
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "esp32-test",
    "hr": 75,
    "spo2": 98,
    "ecg": [0.5, 0.6, 0.4],
    "ppg": [200, 185, 190]
  }'

# Get recent vitals
curl http://localhost:5000/api/vitals/recent?minutes=5

# Generate doctor report
curl -X POST http://localhost:5000/api/vitals/send-to-doctor \
  -H "Content-Type: application/json" \
  -d '{
    "minutes": 5,
    "format": "json"
  }'

# Get stats
curl http://localhost:5000/api/vitals/stats

# Health check
curl http://localhost:5000/api/health
```

---

## Notes

1. **Timestamps:** All timestamps are server-generated in ISO 8601 format (UTC).
2. **BP Prediction:** Requires ML service running on port 5001. If unavailable, SBP/DBP will be null.
3. **Data Retention:** Currently unlimited. Add cleanup logic if needed (see `cleanOldReadings()` in database.js).
4. **Race Conditions:** Prevented by async/await and lowdb's atomic writes.
5. **Validation:** Non-blocking warnings logged but don't reject requests.
6. **Email:** Placeholder implementation - requires SMTP configuration.
7. **PDF Generation:** Requires puppeteer or pdfkit installation.

---

## Troubleshooting

### Database Issues
- Check if `backend/db/vitals.json` exists and is writable
- Verify file permissions
- Check disk space

### ML Prediction Failures
- Ensure Python ML service is running: `python main.py`
- Check `ML_MODEL_URL` in .env
- Verify model file `bp_cnn_bilstm.pth` exists

### Socket.IO Connection Issues
- Check CORS configuration
- Verify firewall settings
- Check frontend Socket.IO URL

---

## Future Enhancements

- [ ] Add data retention policy with automatic cleanup
- [ ] Implement email service with Nodemailer
- [ ] Add PDF generation with puppeteer
- [ ] Add authentication/authorization
- [ ] Add rate limiting
- [ ] Add data compression for large arrays
- [ ] Add database backups
- [ ] Add monitoring and alerting
- [ ] Add GraphQL support
- [ ] Add data export to other formats (CSV, Excel)

---

**Last Updated:** February 11, 2026
**Version:** 2.0.0
