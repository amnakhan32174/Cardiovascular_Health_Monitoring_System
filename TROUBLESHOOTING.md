# Troubleshooting: ESP32 Data Not Showing in Dashboard

## 🔍 Quick Diagnostic Steps

### Step 1: Check Backend Server
1. Open terminal in `backend` folder
2. Run: `node server.js`
3. You should see: `✅ Backend running on 0.0.0.0:5000`
4. **Keep this terminal open** - you'll see incoming requests here

### Step 2: Check Arduino Serial Monitor
1. Open Serial Monitor (115200 baud)
2. You should see:
   - `✅ WiFi Connected!`
   - `📤 Sending: {...}`
   - `📡 HTTP Response: 200`

### Step 3: Check Browser Console
1. Open your dashboard in browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. You should see:
   - `✅ LiveSensor: Connected to Socket.io server`
   - `📥 LiveSensor: Received new reading: {...}`

### Step 4: Check Network Tab
1. In browser DevTools, go to **Network** tab
2. Filter by "WS" (WebSocket)
3. You should see a WebSocket connection to `ws://localhost:5000` or your server IP

---

## 🐛 Common Issues & Solutions

### Issue 1: Backend Not Receiving Data

**Symptoms:**
- No logs in backend console when Arduino sends data
- Arduino shows `❌ Error: -1` or connection timeout

**Solutions:**
1. ✅ Check backend is running: `node server.js`
2. ✅ Verify SERVER_URL in Arduino code matches your computer's IP
3. ✅ Check Windows Firewall - allow port 5000
4. ✅ Ensure ESP32 and computer are on same WiFi network
5. ✅ Try pinging your computer's IP from another device

**Test:**
```bash
# In backend folder
node server.js
# Should show: ✅ Backend running on 0.0.0.0:5000
```

---

### Issue 2: Backend Receives Data But Frontend Doesn't Show

**Symptoms:**
- Backend console shows: `📥 Received sensor data: {...}`
- Browser console shows: `❌ LiveSensor: Disconnected` or no connection

**Solutions:**
1. ✅ Check frontend is running: `npm run dev`
2. ✅ Verify Socket.io connection in browser console
3. ✅ Check if frontend is using correct backend URL
4. ✅ Clear browser cache and refresh

**Check Frontend Environment:**
- Look for `.env` file in `frontend` folder
- Should have: `VITE_BACKEND_URL=http://localhost:5000` or your IP

---

### Issue 3: Socket.io Connection Failed

**Symptoms:**
- Browser console: `❌ LiveSensor: Socket.io connection error`
- Network tab shows WebSocket connection failed

**Solutions:**
1. ✅ Backend must be running before frontend
2. ✅ Check CORS settings in backend (should allow `*`)
3. ✅ Try using IP address instead of localhost:
   ```javascript
   // In frontend .env file
   VITE_BACKEND_URL=http://192.168.237.1:5000
   ```
4. ✅ Restart both backend and frontend

---

### Issue 4: WiFi Connection Issues

**Symptoms:**
- Arduino Serial Monitor: `❌ WiFi Connection Failed!`
- No IP address shown

**Solutions:**
1. ✅ Double-check WiFi SSID and password
2. ✅ Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. ✅ Check ESP32 is within WiFi range
4. ✅ Try restarting ESP32

---

### Issue 5: Data Format Issues

**Symptoms:**
- Backend receives data but shows errors
- Frontend receives data but values are null

**Solutions:**
1. ✅ Check JSON format in Arduino Serial Monitor
2. ✅ Ensure all values are numbers (not strings)
3. ✅ Verify field names match: `hr`, `spo2`, `sbp`, `dbp`

---

## 🔧 Step-by-Step Debugging

### 1. Test Backend Endpoint Directly

Use Postman or curl to test:

```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-001","hr":85,"spo2":95,"sbp":120,"dbp":80}'
```

Should return: `{"message":"Reading received successfully",...}`

### 2. Check Socket.io Connection

In browser console, type:
```javascript
// Should show connection status
console.log(socket.connected);
```

### 3. Monitor Backend Logs

Watch backend console for:
- `📥 Received sensor data:` - Arduino data received
- `📤 Broadcasting to Socket.io clients...` - Broadcasting to frontend
- `✅ Client connected:` - Frontend connected

### 4. Monitor Frontend Logs

Watch browser console for:
- `✅ LiveSensor: Connected to Socket.io server` - Connected
- `📥 LiveSensor: Received new reading:` - Data received

---

## ✅ Verification Checklist

- [ ] Backend server running (`node server.js`)
- [ ] Frontend running (`npm run dev`)
- [ ] Arduino connected to WiFi
- [ ] Arduino sending data (check Serial Monitor)
- [ ] Backend receiving data (check backend console)
- [ ] Frontend connected to Socket.io (check browser console)
- [ ] Frontend receiving data (check browser console)
- [ ] Dashboard displaying values

---

## 🆘 Still Not Working?

1. **Check all console logs:**
   - Arduino Serial Monitor
   - Backend terminal
   - Browser console (F12)

2. **Verify network:**
   - ESP32 and computer on same WiFi
   - Firewall not blocking port 5000
   - No VPN interfering

3. **Try restarting everything:**
   - Restart backend
   - Restart frontend
   - Restart ESP32
   - Clear browser cache

4. **Test with fixed Arduino code:**
   - Use `ESP32_Fixed.ino` from the esp32 folder
   - It has better error handling and logging

---

## 📞 Quick Test Commands

```bash
# Test backend health
curl http://localhost:5000/api/health

# Test backend endpoint
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","hr":85,"spo2":95}'

# Check if port is open (Windows)
netstat -an | findstr :5000
```

---

## 💡 Pro Tips

1. **Always check backend console first** - it shows if data is being received
2. **Use browser console** - it shows Socket.io connection status
3. **Check Serial Monitor** - it shows if Arduino is sending data
4. **Start backend before frontend** - Socket.io needs server running first
5. **Use fixed Arduino code** - `ESP32_Fixed.ino` has better error handling
