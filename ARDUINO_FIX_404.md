# Arduino 404 Fix – Wrong Backend Route

## Cause
- Your **Arduino** sends: `POST http://10.70.4.200:5000/predict`
- The app actually running on port 5000 is **Node.js** (`server.js`), which has **no** `/predict` route.
- Node only has: `POST /api/readings` and `GET /api/health`
- So the server returns **404 Not Found**.

The Python FastAPI app in `main.py` does define `POST /predict`, but that runs as a separate process (e.g. `uvicorn main:app`) and is not what `npm start` / `node server.js` starts.

## Fix: Use the Route That Exists

Change the Arduino **server URL** from `/predict` to `/api/readings`:

```cpp
// OLD (causes 404):
const char* serverUrl = "http://10.70.4.200:5000/predict";

// NEW (correct for current backend):
const char* serverUrl = "http://10.70.4.200:5000/api/readings";
```

Then:
1. Re-upload the sketch to the Arduino/ESP32.
2. Open Serial Monitor (115200 baud).
3. You should see **200** (HTTP OK) instead of 404, and the backend/dashboard will receive the data.

## Optional: See More in Serial Monitor

To see both status and response body, you can add after `int code = http.POST(payload);`:

```cpp
int code = http.POST(payload);
Serial.print("HTTP ");
Serial.println(code);
if (code == 200) {
  Serial.println(http.getString());
}
```

## If You Want to Use Python `/predict` Instead

Then you must run the **Python** backend on port 5000 (and not the Node server on 5000 at the same time), for example:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 5000
```

And keep the Arduino URL as:

```cpp
const char* serverUrl = "http://10.70.4.200:5000/predict";
```

Your current payload shape (`hr`, `spo2`, `ecg[]`, `ppg[]`) already matches the Python `SensorPacket` model.
