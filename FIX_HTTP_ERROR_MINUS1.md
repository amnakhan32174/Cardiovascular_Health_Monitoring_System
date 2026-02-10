# Fix: HTTP Response -1 (Connection Failed)

## 🔍 Problem
Your ESP32 is showing `📡 HTTP Response: -1` which means it **cannot connect** to the backend server.

## ✅ Quick Fixes

### Fix 1: Check Backend is Running ⚠️ MOST IMPORTANT

1. **Open terminal in `backend` folder**
2. **Run:**
   ```bash
   node server.js
   ```
3. **You should see:**
   ```
   ✅ Backend running on 0.0.0.0:5000
   ```
4. **Keep this terminal open** - backend must stay running!

### Fix 2: Verify Your Computer's IP Address

**On Windows:**
1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. Example: `192.168.1.100` or `192.168.237.1`

**On Mac/Linux:**
1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for your network interface IP address

**Update Arduino code:**
```cpp
const char* SERVER_URL = "http://YOUR_ACTUAL_IP:5000";
// Example: "http://192.168.1.100:5000"
```

### Fix 3: Check Windows Firewall

1. **Open Windows Defender Firewall**
2. **Click "Advanced settings"**
3. **Click "Inbound Rules" → "New Rule"**
4. **Select "Port" → Next**
5. **TCP, Specific local ports: 5000**
6. **Allow the connection**
7. **Apply to all profiles**
8. **Name it: "Node.js Backend"**

**Or temporarily disable firewall to test:**
- Settings → Privacy & Security → Windows Security → Firewall
- Turn off firewall (temporarily for testing)

### Fix 4: Verify Same Network

1. **Check ESP32 IP:**
   - Look in Serial Monitor: `IP Address: 192.168.x.x`

2. **Check your computer's IP:**
   - Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

3. **They should be on same subnet:**
   - ESP32: `192.168.237.x`
   - Computer: `192.168.237.x`
   - First 3 numbers should match!

### Fix 5: Test Connection Manually

**Test 1: Ping from ESP32**
- Use `ESP32_Connection_Test.ino` to diagnose

**Test 2: Test from Browser**
- Open: `http://localhost:5000/api/health`
- Should show: `{"status":"ok",...}`

**Test 3: Test from Another Device**
- On your phone (same WiFi), open: `http://YOUR_IP:5000/api/health`
- If this works, ESP32 should work too

## 🔧 Step-by-Step Debugging

### Step 1: Run Diagnostic Test

1. Upload `ESP32_Connection_Test.ino` to your ESP32
2. Open Serial Monitor (115200 baud)
3. It will test:
   - WiFi connection
   - Network connectivity
   - HTTP connection
   - Backend endpoint

### Step 2: Check Backend Logs

When ESP32 tries to connect, backend should show:
```
➡️ POST /api/readings
📥 Received sensor data: {...}
```

**If you don't see this:**
- Backend is not receiving requests
- Connection is being blocked

### Step 3: Verify Network Settings

**ESP32 Serial Monitor should show:**
```
✅ WiFi Connected!
   IP Address: 192.168.237.xxx
   Gateway: 192.168.237.1
```

**Your computer should be:**
- Same network: `192.168.237.x`
- Gateway should match ESP32's gateway

## 🐛 Common Issues

### Issue 1: Backend Not Running
**Symptom:** Error -1, no logs in backend console

**Fix:**
```bash
cd backend
node server.js
# Keep this running!
```

### Issue 2: Wrong IP Address
**Symptom:** Error -1, backend is running

**Fix:**
1. Find your actual IP: `ipconfig`
2. Update `SERVER_URL` in Arduino code
3. Upload again

### Issue 3: Firewall Blocking
**Symptom:** Error -1, backend running, correct IP

**Fix:**
- Allow port 5000 in Windows Firewall
- Or temporarily disable firewall to test

### Issue 4: Different Networks
**Symptom:** ESP32 on different WiFi than computer

**Fix:**
- Connect ESP32 to same WiFi network as computer
- Check both IP addresses are on same subnet

### Issue 5: Port Already in Use
**Symptom:** Backend shows "EADDRINUSE" error

**Fix:**
```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process or use different port
```

## ✅ Verification Checklist

- [ ] Backend server is running (`node server.js`)
- [ ] Backend shows: `✅ Backend running on 0.0.0.0:5000`
- [ ] ESP32 connected to WiFi
- [ ] ESP32 shows IP address in Serial Monitor
- [ ] Computer and ESP32 on same network
- [ ] SERVER_URL in Arduino matches computer's IP
- [ ] Firewall allows port 5000
- [ ] Can access `http://localhost:5000/api/health` in browser

## 🧪 Quick Test

1. **Start backend:**
   ```bash
   cd backend
   node server.js
   ```

2. **Check it's accessible:**
   - Browser: `http://localhost:5000/api/health`
   - Should return JSON

3. **Test from phone (same WiFi):**
   - `http://YOUR_COMPUTER_IP:5000/api/health`
   - If this works, ESP32 should work

4. **Upload ESP32 code:**
   - Use `ESP32_Fixed.ino` or `ESP32_Connection_Test.ino`
   - Check Serial Monitor for connection status

## 💡 Pro Tips

1. **Always start backend first** before testing ESP32
2. **Use `ESP32_Connection_Test.ino`** to diagnose issues
3. **Check backend console** - it shows if requests arrive
4. **Test from browser first** - if browser works, ESP32 should work
5. **Use actual IP, not localhost** - ESP32 can't use localhost

## 🆘 Still Not Working?

1. **Run diagnostic test:**
   - Upload `ESP32_Connection_Test.ino`
   - Check all test results

2. **Check all logs:**
   - ESP32 Serial Monitor
   - Backend console
   - Browser console (if testing from browser)

3. **Verify network:**
   - Both on same WiFi
   - Same subnet
   - Firewall not blocking

4. **Try these:**
   - Restart backend
   - Restart ESP32
   - Restart WiFi router
   - Try different port (e.g., 5001)
