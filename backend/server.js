require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { predictBP } = require("./services/mlService");
const { 
  initDatabase, 
  saveReading, 
  getRecentVitals, 
  getLatestReading,
  getStats 
} = require("./db/database");
const { 
  validateSensorReading, 
  validateRecentVitalsQuery,
  validateSendToDoctor 
} = require("./middleware/validation");
const {
  generateJsonReport,
  generateTextReport,
  saveReportToFile,
  sendReportViaEmail
} = require("./services/reportService");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Store last reading in memory for quick access (also saved to DB)
let latestReading = null;

// Initialize database on startup
initDatabase().catch(err => {
  console.error("❌ Database initialization failed:", err);
  process.exit(1);
});

// CSV functions removed - system now uses LIVE sensor data only
// All predictions are based on real-time ESP32 data
// No CSV dependency required

/* =========================
   API: RECEIVE SENSOR DATA FROM ESP32
   ========================= */
app.post("/api/readings", validateSensorReading, async (req, res) => {
  try {
    const packet = req.body || {};

    console.log("\n📥 Raw sensor packet:", packet);

    // Log validation warnings if any
    if (req.validationWarnings && req.validationWarnings.length > 0) {
      console.warn("⚠️ Validation warnings:", req.validationWarnings);
    }

    /* ---------- Normalize incoming data ---------- */
    const normalized = {
      deviceId: packet.deviceId || "esp32-device",
      timestamp: new Date().toISOString(), // Server-generated timestamp

      // Heart rate and SpO2
      hr: packet.hr ?? null,
      spo2: packet.spo2 ?? null,

      // ECG data (array)
      ecg: Array.isArray(packet.ecg) ? packet.ecg : [],
      ecg_data: Array.isArray(packet.ecg) ? packet.ecg : [], // Frontend expects this

      // PPG data (array)
      ppg: Array.isArray(packet.ppg) ? packet.ppg : [],

      // Blood pressure (will be predicted)
      sbp: null,
      dbp: null,

      // Blood sugar (not from ESP32, set to null)
      blood_sugar: null
    };

    /* ---------- Call ML model for BP prediction ---------- */
    try {
      const bpPrediction = await predictBP(normalized);

      if (bpPrediction && bpPrediction.mean_bp) {
        // Convert mean BP to SBP/DBP (rough estimation)
        normalized.sbp = Math.round(bpPrediction.mean_bp * 1.33);
        normalized.dbp = Math.round(bpPrediction.mean_bp * 0.67);
        normalized.mean_bp = bpPrediction.mean_bp;
        console.log(`🩺 BP Predicted: ${normalized.sbp}/${normalized.dbp} (Mean: ${normalized.mean_bp})`);
      } else {
        console.warn("⚠️ BP prediction unavailable");
      }
    } catch (bpError) {
      console.error("❌ BP prediction failed:", bpError.message);
      // Continue without BP prediction
    }

    /* ---------- Save to database ---------- */
    try {
      const savedReading = await saveReading(normalized);
      console.log(`✅ Reading saved to database: ${savedReading.id}`);
    } catch (dbError) {
      console.error("❌ Database save failed:", dbError.message);
      // Continue even if DB save fails (reading still goes to frontend)
    }

    // Update in-memory cache
    latestReading = normalized;

    /* ---------- Send to frontend via Socket.IO ---------- */
    io.emit("new_reading", normalized);
    io.emit("newReading", normalized); // Support both event names

    res.json({
      ok: true,
      message: "Reading received and stored successfully",
      data: normalized,
      warnings: req.validationWarnings || []
    });

  } catch (err) {
    console.error("❌ /api/readings error:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
      details: "Failed to process sensor reading"
    });
  }
});

/* =========================
   GET RECENT VITALS
   ========================= */
app.get("/api/vitals/recent", validateRecentVitalsQuery, async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 5; // Default: 5 minutes
    const deviceId = req.query.deviceId || null;

    console.log(`📊 Fetching vitals from last ${minutes} minutes${deviceId ? ` for device ${deviceId}` : ''}`);

    const vitals = await getRecentVitals(minutes, deviceId);

    res.json({
      ok: true,
      data: {
        time_range_minutes: minutes,
        device_id: deviceId || 'all',
        count: vitals.length,
        vitals: vitals
      }
    });

  } catch (err) {
    console.error("❌ /api/vitals/recent error:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
      details: "Failed to retrieve recent vitals"
    });
  }
});

/* =========================
   SEND VITALS TO DOCTOR
   ========================= */
app.post("/api/vitals/send-to-doctor", validateSendToDoctor, async (req, res) => {
  try {
    const { 
      deviceId = null, 
      minutes = 5, 
      format = 'json',
      email = null 
    } = req.body;

    console.log(`📧 Generating doctor report: ${format} format, last ${minutes} minutes`);

    // Fetch recent vitals
    const vitals = await getRecentVitals(minutes, deviceId);

    if (vitals.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'No vitals data found',
        details: `No readings available for the last ${minutes} minutes`
      });
    }

    const reportOptions = { deviceId, minutes };

    // Generate report based on format
    if (format === 'json') {
      const report = generateJsonReport(vitals, reportOptions);
      const filepath = saveReportToFile(report, 'json', deviceId || 'device');
      
      res.json({
        ok: true,
        message: 'Report generated successfully',
        format: 'json',
        data: report,
        file: {
          path: filepath,
          download_url: `/api/vitals/download/${path.basename(filepath)}`
        }
      });

    } else if (format === 'pdf') {
      // PDF generation would require a library like puppeteer or pdfkit
      // For now, we'll generate text report and note that PDF requires setup
      const textReport = generateTextReport(vitals, reportOptions);
      const filepath = saveReportToFile(textReport, 'txt', deviceId || 'device');
      
      res.json({
        ok: true,
        message: 'Text report generated (PDF generation requires additional setup)',
        format: 'text',
        data: textReport,
        file: {
          path: filepath,
          download_url: `/api/vitals/download/${path.basename(filepath)}`
        },
        note: 'PDF generation requires puppeteer or pdfkit. Install with: npm install puppeteer'
      });

    } else if (format === 'email') {
      const textReport = generateTextReport(vitals, reportOptions);
      const emailResult = await sendReportViaEmail(textReport, email, reportOptions);
      
      res.json({
        ok: emailResult.success,
        message: emailResult.message,
        details: emailResult.details,
        fallback: emailResult.fallback,
        configuration_needed: emailResult.configuration_needed
      });

    } else {
      res.status(400).json({
        ok: false,
        error: 'Invalid format',
        details: 'Format must be one of: json, pdf, email'
      });
    }

  } catch (err) {
    console.error("❌ /api/vitals/send-to-doctor error:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
      details: "Failed to generate or send report"
    });
  }
});

/* =========================
   DOWNLOAD REPORT FILE
   ========================= */
app.get("/api/vitals/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'reports', filename);

    // Security: prevent directory traversal
    if (!filename.match(/^vitals_report_.*\.(json|txt)$/)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        ok: false,
        error: 'File not found'
      });
    }

    res.download(filepath);

  } catch (err) {
    console.error("❌ /api/vitals/download error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/* =========================
   DATABASE STATISTICS
   ========================= */
app.get("/api/vitals/stats", async (req, res) => {
  try {
    const stats = await getStats();
    
    res.json({
      ok: true,
      data: stats
    });

  } catch (err) {
    console.error("❌ /api/vitals/stats error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/* =========================
   HEALTH CHECK
   ========================= */
app.get("/api/health", async (req, res) => {
  try {
    const stats = await getStats();
    
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      mlModelUrl: process.env.ML_MODEL_URL || "disabled",
      database: {
        connected: true,
        totalReadings: stats.totalReadings,
        last24Hours: stats.last24Hours
      },
      latestReading: latestReading || "none"
    });
  } catch (err) {
    res.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      mlModelUrl: process.env.ML_MODEL_URL || "disabled",
      database: {
        connected: false,
        error: err.message
      },
      latestReading: latestReading || "none"
    });
  }
});

/* =========================
   CSV ENDPOINT REMOVED
   ========================= */
// The /api/predict-from-csv endpoint has been removed
// System now exclusively uses LIVE sensor data from ESP32
// All predictions are based on real-time PPG and ECG data

/* =========================
   SOCKET.IO
   ========================= */
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Send latest reading to newly connected client
  if (latestReading) {
    socket.emit("new_reading", latestReading);
    socket.emit("newReading", latestReading);
  }

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });

  // Chat functionality
  socket.on("join_room", (data) => {
    console.log("User joined room:", data);
  });

  socket.on("chat_message", (data) => {
    console.log("Chat message:", data);
    socket.broadcast.emit("chat_message", data);
  });
});

/* =========================
   START SERVER
   ========================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🤖 ML Model URL: ${process.env.ML_MODEL_URL || "Not configured"}`);
});
