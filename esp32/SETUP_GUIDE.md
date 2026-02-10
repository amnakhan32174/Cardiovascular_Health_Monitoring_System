# ESP32 Setup Guide for Cardio Dashboard

This guide will help you connect your ESP32 to the Cardio Dashboard backend and display live sensor values.

## 📋 Prerequisites

1. **Arduino IDE** installed with ESP32 board support
2. **WiFi network** credentials
3. **Backend server** running (on your computer or network)
4. **ArduinoJson library** installed

## 🔧 Step 1: Install Required Libraries

1. Open Arduino IDE
2. Go to **Tools → Manage Libraries**
3. Search for **"ArduinoJson"** and install it (by Benoit Blanchon)
4. Close the Library Manager

## 🔌 Step 2: Choose Your Sketch

You have two options depending on your setup:

### Option A: Direct Sensor Reading (`ESP32_Sensor_Client.ino`)
Use this if you have sensors directly connected to ESP32 pins.

### Option B: Serial Monitor Reader (`ESP32_Serial_Reader.ino`)
Use this if you're already printing sensor values to Serial Monitor and want to forward them.

## ⚙️ Step 3: Configure the Sketch

### For Both Sketches:

1. Open the `.ino` file in Arduino IDE
2. Update these values:

```cpp
// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";    // Your WiFi password

// Backend Server URL
const char* SERVER_URL = "http://192.168.1.100:5000";  // Your server IP
```

### Finding Your Server IP:

**On Windows:**
1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. Example: `192.168.1.100`

**On Mac/Linux:**
1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for your network interface IP address

**Important:** Make sure your ESP32 and computer are on the same WiFi network!

### For Direct Sensor Reading (`ESP32_Sensor_Client.ino`):

Update the pin numbers based on your hardware:

```cpp
const int ECG_PIN = A0;        // Your ECG sensor pin
const int HR_PIN = A1;         // Your heart rate sensor pin
const int SPO2_PIN = A2;       // Your SpO2 sensor pin
const int BP_PIN = A3;         // Your blood pressure sensor pin
```

You'll also need to modify the sensor reading functions (`readHeartRate()`, `readSpO2()`, etc.) to match your actual sensor hardware and conversion formulas.

### For Serial Monitor Reader (`ESP32_Serial_Reader.ino`):

No additional configuration needed! Just make sure your existing code prints sensor values in this format:

```
HR:85,SpO2:95,SBP:120,DBP:80
```

or

```
HR=85,SpO2=95,SBP=120,DBP=80
```

## 📤 Step 4: Upload and Test

1. **Select Board:**
   - Go to **Tools → Board → ESP32 Arduino**
   - Select your ESP32 board model

2. **Select Port:**
   - Go to **Tools → Port**
   - Select the COM port where your ESP32 is connected

3. **Upload:**
   - Click the **Upload** button (→)
   - Wait for "Done uploading" message

4. **Open Serial Monitor:**
   - Click **Tools → Serial Monitor**
   - Set baud rate to **115200**
   - You should see connection status and data transmission logs

## 🖥️ Step 5: Start Backend Server

Make sure your backend server is running:

```bash
cd backend
node server.js
```

You should see:
```
✅ Backend running on http://localhost:5000
```

## 🌐 Step 6: View Live Data

1. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open Dashboard:**
   - Navigate to `http://localhost:5173` (or your frontend URL)
   - Login to your account
   - Go to Dashboard
   - You should see live sensor data updating in real-time!

## 🔍 Troubleshooting

### ESP32 Can't Connect to WiFi
- ✅ Check WiFi credentials (SSID and password)
- ✅ Make sure ESP32 is within WiFi range
- ✅ Verify WiFi is 2.4GHz (ESP32 doesn't support 5GHz)

### Can't Connect to Backend Server
- ✅ Check SERVER_URL is correct (use IP address, not localhost)
- ✅ Make sure backend server is running
- ✅ Verify ESP32 and computer are on same network
- ✅ Check Windows Firewall isn't blocking port 5000

### No Data Appearing in Dashboard
- ✅ Check Serial Monitor for error messages
- ✅ Verify backend is receiving data (check backend console logs)
- ✅ Check browser console for Socket.io connection errors
- ✅ Make sure frontend is connected to correct backend URL

### Serial Monitor Shows Connection Errors
- ✅ Verify backend server is running
- ✅ Check SERVER_URL format (should be `http://IP:PORT`)
- ✅ Try pinging the server IP from another device

## 📊 Data Format

The backend expects JSON data in this format:

```json
{
  "deviceId": "esp32-device-001",
  "timestamp": "2026-01-26T12:34:56.000Z",
  "hr": 85,
  "spo2": 95,
  "sbp": 120,
  "dbp": 80,
  "blood_sugar": null,
  "ecg_data": [0.1, 0.2, 0.15, ...]
}
```

All fields except `deviceId` and `timestamp` are optional. Send only the values you have.

## 🔄 How It Works

1. **ESP32** reads sensor values
2. **ESP32** sends HTTP POST request to `/api/readings` endpoint
3. **Backend** receives the data and processes it
4. **Backend** broadcasts data via Socket.io to all connected clients
5. **Frontend** receives data via Socket.io and updates the dashboard in real-time

## 📝 Example Serial Output

When working correctly, you should see:

```
=================================
ESP32 Sensor Client Starting...
=================================

Connecting to WiFi: YourNetwork
..........
✅ WiFi Connected!
IP Address: 192.168.1.50
Signal Strength (RSSI): -45 dBm

✅ Setup complete!
Starting sensor data transmission...

📤 Sending sensor data:
{"deviceId":"esp32-device-001","timestamp":"2026-01-26T12:34:56.000Z","hr":85,"spo2":95,"sbp":120,"dbp":80}
HR: 85 BPM
SpO2: 95 %
BP: 120/80 mmHg
✅ Response code: 200
Response: {"message":"Reading received successfully",...}
```

## 🎯 Next Steps

- Customize sensor reading functions for your specific hardware
- Adjust `SEND_INTERVAL` to change data transmission frequency
- Add more sensors (temperature, etc.)
- Implement error handling and reconnection logic
- Add data validation before sending

## 💡 Tips

- Start with the Serial Monitor Reader version to test the connection
- Use Serial Monitor to debug and see what data is being sent
- Check backend console logs to verify data is being received
- Test with a simple HTTP client (like Postman) first before using ESP32

## 🆘 Need Help?

If you encounter issues:
1. Check Serial Monitor output for error messages
2. Check backend server console for incoming requests
3. Check browser console (F12) for frontend errors
4. Verify all components are on the same network
