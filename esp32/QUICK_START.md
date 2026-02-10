# Quick Start: ESP32 to Dashboard

## 🚀 Fast Setup (5 minutes)

### 1. Install ArduinoJson Library
- Arduino IDE → Tools → Manage Libraries → Search "ArduinoJson" → Install

### 2. Configure ESP32 Sketch
Open `ESP32_Serial_Reader.ino` and update:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://YOUR_COMPUTER_IP:5000";
```

**Find your computer's IP:**
- Windows: `ipconfig` → Look for "IPv4 Address"
- Mac/Linux: `ifconfig` → Look for your network IP

### 3. Upload to ESP32
- Select Board: ESP32
- Select Port: COM port of your ESP32
- Click Upload

### 4. Start Backend
```bash
cd backend
node server.js
```

### 5. Start Frontend
```bash
cd frontend
npm run dev
```

### 6. Send Test Data
Open Serial Monitor (115200 baud) and type:
```
HR:85,SpO2:95,SBP:120,DBP:80
```

Press Enter. Check your dashboard - data should appear!

## 📡 How It Works

```
ESP32 → HTTP POST → Backend → Socket.io → Frontend Dashboard
```

1. ESP32 sends sensor data via HTTP POST to `/api/readings`
2. Backend receives and broadcasts via Socket.io
3. Frontend receives real-time updates and displays them

## 🔧 Two Options

### Option 1: Serial Monitor Reader (Easiest)
- Use `ESP32_Serial_Reader.ino`
- Print sensor values to Serial Monitor
- ESP32 forwards them to backend
- **Best for:** Testing or if you already have Serial output

### Option 2: Direct Sensor Reading
- Use `ESP32_Sensor_Client.ino`
- Reads directly from sensor pins
- **Best for:** Production setup with hardware sensors

## ✅ Verification Checklist

- [ ] ArduinoJson library installed
- [ ] WiFi credentials configured
- [ ] Server IP address set correctly
- [ ] Backend server running (`node server.js`)
- [ ] Frontend running (`npm run dev`)
- [ ] ESP32 and computer on same WiFi network
- [ ] Serial Monitor open (115200 baud)

## 🐛 Common Issues

**ESP32 can't connect:**
- Check WiFi credentials
- Ensure 2.4GHz network (not 5GHz)

**No data in dashboard:**
- Check Serial Monitor for errors
- Verify backend is running
- Check browser console (F12)

**Connection refused:**
- Use IP address, not `localhost`
- Check firewall settings
- Verify same WiFi network

## 📝 Data Format

Send data in Serial Monitor as:
```
HR:85,SpO2:95,SBP:120,DBP:80
```

Or modify your existing code to print in this format!
