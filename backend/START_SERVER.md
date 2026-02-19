# How to Start and Test the Cardio Dashboard Backend

## Prerequisites Check

Before starting, make sure you have:
- ✅ Node.js installed
- ✅ npm packages installed (run `npm install` if not)

## Step 1: Start the Backend Server

Open PowerShell in the backend directory and run:

```powershell
npm start
```

**Expected Output:**
```
✅ Database initialized at: D:\cardio-dashboard pichle wala\backend\db\vitals.json
✅ Backend running on http://0.0.0.0:5000
📡 Socket.IO ready for connections
🤖 ML Model URL: http://localhost:5001/predict
```

**Leave this terminal open** - the server needs to keep running.

---

## Step 2: Test the Server (Option A - Automated)

Open a **NEW PowerShell terminal** in the backend directory and run:

```powershell
.\test-windows.ps1
```

This will automatically test all endpoints.

---

## Step 2: Test the Server (Option B - Manual with PowerShell)

Open a **NEW PowerShell terminal** and test each endpoint:

### Test 1: Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
```

### Test 2: Send a Test Reading
```powershell
$body = @{
    deviceId = "test-device"
    hr = 75
    spo2 = 98
    ecg = @(0.5, 0.6, 0.4)
    ppg = @(200, 185, 190)
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/readings" -Method Post -Body $body -ContentType "application/json"
```

### Test 3: Get Recent Vitals
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/vitals/recent?minutes=5" -Method Get
```

### Test 4: Generate Doctor Report
```powershell
$body = @{
    minutes = 5
    format = "json"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/vitals/send-to-doctor" -Method Post -Body $body -ContentType "application/json"
```

### Test 5: Get Statistics
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/vitals/stats" -Method Get
```

---

## Step 3: View the Database

After sending some test readings, view the database:

```powershell
Get-Content backend\db\vitals.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

Or simply open the file in your editor:
```
D:\cardio-dashboard pichle wala\backend\db\vitals.json
```

---

## Step 4: Start ML Service (Optional)

If you want BP predictions, start the ML service in another terminal:

```powershell
cd backend
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:5001
```

**Note:** The ML service has an import error that needs fixing. The backend will work without it, but BP predictions (sbp/dbp) will be null.

---

## Troubleshooting

### Issue: "npm start" fails
**Solution:**
```powershell
cd backend
npm install
npm start
```

### Issue: Port 5000 already in use
**Solution:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in .env
# PORT=5001
```

### Issue: Python ML service fails
**Error:** `ImportError: cannot import name 'CNN_BiLSTM'`

This is a known issue in `main.py`. For now, the backend works without it. BP predictions will be null.

To fix it, you would need to check `ml_utils.py` and ensure the class name matches.

### Issue: Database not created
**Solution:**
The database is auto-created on first run. Check that the backend has write permissions:
```powershell
Test-Path "backend\db\vitals.json"
```

---

## Success Indicators

✅ Server started without errors  
✅ Health check returns `"status": "ok"`  
✅ Test reading accepted and saved  
✅ Database file created at `backend\db\vitals.json`  
✅ Recent vitals endpoint returns data  
✅ Reports can be generated  

---

## What's Next?

1. **Connect your ESP32:**
   - Update ESP32 code with your computer's IP address
   - ESP32 will automatically send data to `/api/readings`

2. **Start the Frontend:**
   ```powershell
   cd ..\frontend
   npm install
   npm run dev
   ```

3. **Monitor in Real-Time:**
   - Frontend will show live vitals via Socket.IO
   - All data is automatically saved to database

---

## Useful Commands

```powershell
# Check if server is running
Test-NetConnection -ComputerName localhost -Port 5000

# View server logs (if running as background service)
Get-Content backend\server.log -Tail 20 -Wait

# Count readings in database
(Get-Content backend\db\vitals.json | ConvertFrom-Json).vitals.Count

# View latest reading
(Get-Content backend\db\vitals.json | ConvertFrom-Json).vitals[-1]

# Stop all Node processes (if needed)
Get-Process node | Stop-Process -Force
```

---

## Terminal Setup

**Terminal 1:** Backend Server
```powershell
cd "D:\cardio-dashboard pichle wala\backend"
npm start
```

**Terminal 2:** Testing / Commands
```powershell
cd "D:\cardio-dashboard pichle wala\backend"
.\test-windows.ps1
```

**Terminal 3:** Frontend (optional)
```powershell
cd "D:\cardio-dashboard pichle wala\frontend"
npm run dev
```

---

**You're all set! Start the server and run the tests.** 🚀
