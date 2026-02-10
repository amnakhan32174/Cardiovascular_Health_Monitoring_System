# How to Display Serial Monitor Values in Dashboard

If you already have sensor values printing to Serial Monitor, here's how to display them in your dashboard:

## 🎯 Quick Solution

You have **3 options** depending on your setup:

---

## Option 1: Modify Your Existing Arduino Code (Recommended)

**Best if:** You have access to your Arduino sketch code

### Steps:

1. **Open your existing Arduino sketch** that reads sensors

2. **Add these includes at the top:**
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
```

3. **Add WiFi configuration:**
```cpp
const char* ssid = "NUST Central Library";
const char* password = "Nust@123";
const char* SERVER_URL = "http://192.168.237.1:5000";  // Your computer's IP
const char* DEVICE_ID = "esp32-device-001";
```

4. **Add WiFi connection function:**
```cpp
void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
}
```

5. **Add send function:**
```cpp
void sendToDashboard(float hr, float spo2, float sbp, float dbp) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = "2026-01-26T12:00:00.000Z";  // Or use real timestamp
  if (hr > 0) doc["hr"] = hr;
  if (spo2 > 0) doc["spo2"] = spo2;
  if (sbp > 0) doc["sbp"] = sbp;
  if (dbp > 0) doc["dbp"] = dbp;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/readings");
  http.addHeader("Content-Type", "application/json");
  http.POST(jsonPayload);
  http.end();
}
```

6. **Call it after reading sensors:**
```cpp
void loop() {
  // Your existing sensor reading code
  float hr = readHeartRate();
  float spo2 = readSpO2();
  float sbp = readSBP();
  float dbp = readDBP();
  
  // Your existing Serial.print statements
  Serial.print("HR: "); Serial.println(hr);
  Serial.print("SpO2: "); Serial.println(spo2);
  
  // ADD THIS LINE to send to dashboard:
  sendToDashboard(hr, spo2, sbp, dbp);
  
  delay(1000);
}
```

7. **Call connectToWiFi() in setup():**
```cpp
void setup() {
  Serial.begin(115200);
  connectToWiFi();
  // ... rest of your setup
}
```

---

## Option 2: Use ESP32_Auto_Forward.ino Template

**Best if:** You want a complete template to copy from

1. Open `ESP32_Auto_Forward.ino`
2. Copy the WiFi setup and `sendSensorData()` function
3. Paste into your existing sketch
4. Call `sendSensorData(hr, spo2, sbp, dbp)` after reading sensors

---

## Option 3: Manual Testing via Serial Monitor

**Best if:** You just want to test quickly

1. Upload `ESP32_Serial_Reader.ino` to your ESP32
2. Open Serial Monitor (115200 baud)
3. Type sensor values in this format:
   ```
   HR:85,SpO2:95,SBP:120,DBP:80
   ```
4. Press Enter
5. Data will be sent to dashboard!

---

## 🔧 What Format Should Your Serial Output Be?

The dashboard can parse these formats:

✅ **Supported:**
- `HR:85,SpO2:95,SBP:120,DBP:80`
- `HR=85,SpO2=95,SBP=120,DBP=80`
- `Heart Rate: 85, Oxygen: 95` (if you modify parser)

❌ **Not supported (yet):**
- `HR 85 SpO2 95` (spaces without colons)
- `85,95,120,80` (just numbers)

---

## 📝 Example: Complete Integration

Here's a complete example combining your sensor code with dashboard sending:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Config
const char* ssid = "NUST Central Library";
const char* password = "Nust@123";
const char* SERVER_URL = "http://192.168.237.1:5000";

// Your sensor pins
const int HR_PIN = A0;
const int SPO2_PIN = A1;

void setup() {
  Serial.begin(115200);
  connectToWiFi();
}

void loop() {
  // Read sensors (your existing code)
  float hr = analogRead(HR_PIN) / 40.95;  // Example conversion
  float spo2 = analogRead(SPO2_PIN) / 40.95;
  
  // Print to Serial Monitor (your existing code)
  Serial.print("HR: "); Serial.print(hr);
  Serial.print(", SpO2: "); Serial.println(spo2);
  
  // Send to dashboard (NEW!)
  sendToDashboard(hr, spo2, 0, 0);  // 0 for BP if not available
  
  delay(1000);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
}

void sendToDashboard(float hr, float spo2, float sbp, float dbp) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = "esp32-device-001";
  doc["timestamp"] = "2026-01-26T12:00:00.000Z";
  if (hr > 0) doc["hr"] = hr;
  if (spo2 > 0) doc["spo2"] = spo2;
  if (sbp > 0) doc["sbp"] = sbp;
  if (dbp > 0) doc["dbp"] = dbp;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/readings");
  http.addHeader("Content-Type", "application/json");
  http.POST(jsonPayload);
  http.end();
}
```

---

## ✅ Verification Steps

1. **Check Serial Monitor:**
   - Should show "✅ WiFi Connected!"
   - Should show "📤 Sending: {...}" messages

2. **Check Backend Console:**
   - Should show incoming POST requests
   - Should show "Reading received successfully"

3. **Check Dashboard:**
   - Open your dashboard in browser
   - Values should appear in real-time!

---

## 🐛 Troubleshooting

**Values not appearing?**
- ✅ Check SERVER_URL includes port `:5000`
- ✅ Make sure backend is running (`node server.js`)
- ✅ Check Serial Monitor for error messages
- ✅ Verify WiFi connection is successful

**Connection errors?**
- ✅ Use IP address, not `localhost`
- ✅ Check firewall isn't blocking port 5000
- ✅ Ensure ESP32 and computer on same WiFi network

---

## 💡 Pro Tip

If your Serial output format is different, you can modify the `sendToDashboard()` function to parse your specific format. Just extract the numbers and call `sendSensorData()` with them!
