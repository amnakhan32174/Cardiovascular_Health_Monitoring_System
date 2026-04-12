require("dotenv").config();

const express = require("express");
const fs      = require("fs");
const path    = require("path");
const http    = require("http");
const cors    = require("cors");
const { Server } = require("socket.io");

const { predictBP, predictHeartRateType, predictHeartSoundType, getAvailableWavFiles } =
  require("./services/mlService");
const { initDatabase, saveReading, getRecentVitals, getLatestReading, getStats } =
  require("./db/database");
const { saveSensorReading, getPatientReadings, getLatestPatientReading } =
  require("./db/firebaseAdmin");
const { validateSensorReading, validateRecentVitalsQuery, validateSendToDoctor } =
  require("./middleware/validation");
const { generateJsonReport, generateTextReport, saveReportToFile, sendReportViaEmail } =
  require("./services/reportService");

const app    = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

// ── In-memory state ───────────────────────────────────────────────────────────
let latestReading   = null;
let activePatientId = null;                  // last registered patient UID
const socketPatientMap = new Map();          // socketId → patientId

// Initialize local DB
initDatabase().catch(err => {
  console.error("❌ Database initialization failed:", err);
  process.exit(1);
});

/* ═══════════════════════════════════════════════════════════════════════════
   RECEIVE SENSOR DATA FROM ESP32
   ═══════════════════════════════════════════════════════════════════════════ */
app.post("/api/readings", validateSensorReading, async (req, res) => {
  try {
    const packet = req.body || {};
    console.log("\n📥 ESP32 reading received");

    if (req.validationWarnings?.length > 0) {
      console.warn("⚠️  Validation warnings:", req.validationWarnings);
    }

    const normalized = {
      deviceId:   packet.deviceId  || "esp32-device",
      patientId:  packet.patientId || activePatientId || null,
      timestamp:  new Date().toISOString(),
      hr:         packet.hr   ?? null,
      spo2:       packet.spo2 ?? null,
      ecg:        Array.isArray(packet.ecg) ? packet.ecg : [],
      ecg_data:   Array.isArray(packet.ecg) ? packet.ecg : [],
      ppg:        Array.isArray(packet.ppg) ? packet.ppg : [],
      pcg:        Array.isArray(packet.pcg) ? packet.pcg : [],
      sbp:        null,
      dbp:        null,
      mean_bp:    null,
      blood_sugar: null,
      heart_rate_type:            null,
      heart_rate_type_confidence: null,
    };

    console.log(`👤 Patient: ${normalized.patientId || "not registered"}`);

    // ── BP prediction ─────────────────────────────────────────────────────
    try {
      const bp = await predictBP(normalized);
      if (bp?.mean_bp) {
        normalized.mean_bp = bp.mean_bp;
        normalized.sbp     = Math.round(bp.mean_bp * 1.33);
        normalized.dbp     = Math.round(bp.mean_bp * 0.67);
        console.log(`🩺 BP: ${normalized.sbp}/${normalized.dbp} mmHg`);
      }
    } catch (e) { console.error("❌ BP failed:", e.message); }

    // ── PCG prediction ────────────────────────────────────────────────────
    try {
      const pcg = await predictHeartRateType(normalized);
      if (pcg?.heart_rate_type) {
        normalized.heart_rate_type            = pcg.heart_rate_type;
        normalized.heart_rate_type_confidence = pcg.confidence;
        normalized.heart_sound_all_probs      = pcg.all_probabilities;
        normalized.pcg_source_file            = pcg.source_file;
        console.log(`💓 Heart sound: ${normalized.heart_rate_type} (${(pcg.confidence * 100).toFixed(1)}%)`);
      }
    } catch (e) { console.error("❌ PCG failed:", e.message); }

    // ── Save to local lowdb ───────────────────────────────────────────────
    try {
      const saved = await saveReading(normalized);
      console.log(`💾 Local DB: ${saved.id}`);
    } catch (e) { console.error("❌ Local DB failed:", e.message); }

    // ── Save to Firestore (patient-linked readings only) ───────────────────
    if (normalized.patientId) {
      try {
        // Store summary only — skip large ECG/PPG arrays (Firestore cost)
        await saveSensorReading({
          patientId:   normalized.patientId,
          deviceId:    normalized.deviceId,
          timestamp:   normalized.timestamp,
          hr:          normalized.hr,
          spo2:        normalized.spo2,
          sbp:         normalized.sbp,
          dbp:         normalized.dbp,
          mean_bp:     normalized.mean_bp,
          blood_sugar: normalized.blood_sugar,
          heart_rate_type:            normalized.heart_rate_type,
          heart_rate_type_confidence: normalized.heart_rate_type_confidence,
          heart_sound_all_probs:      normalized.heart_sound_all_probs || null,
          pcg_source_file:            normalized.pcg_source_file || null,
          ecg_samples:  normalized.ecg.length,
          ppg_samples:  normalized.ppg.length,
        });
      } catch (e) { console.error("❌ Firestore failed:", e.message); }
    } else {
      console.warn("⚠️  No patient registered — Firestore save skipped");
    }

    latestReading = normalized;
    io.emit("new_reading", normalized);
    io.emit("newReading",  normalized);

    res.json({
      ok:        true,
      patientId: normalized.patientId || "unlinked",
      data:      normalized,
      warnings:  req.validationWarnings || [],
    });

  } catch (err) {
    console.error("❌ /api/readings error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET PATIENT READINGS FROM FIRESTORE
   GET /api/patient-readings/:patientId
   ═══════════════════════════════════════════════════════════════════════════ */
app.get("/api/patient-readings/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const readings = await getPatientReadings(patientId, limit);
    res.json({ ok: true, patientId, count: readings.length, readings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET LATEST READING FOR A PATIENT
   GET /api/patient-readings/:patientId/latest
   ═══════════════════════════════════════════════════════════════════════════ */
app.get("/api/patient-readings/:patientId/latest", async (req, res) => {
  try {
    const { patientId } = req.params;
    const reading = await getLatestPatientReading(patientId);
    res.json({ ok: true, patientId, reading: reading || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PCG ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
app.post("/api/pcg/predict-wav", async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ ok: false, error: "filename required" });
    const result = await predictHeartSoundType(filename);
    if (!result) return res.status(503).json({ ok: false, error: "PCG model unavailable" });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/pcg/files", (req, res) => {
  res.json({ ok: true, count: getAvailableWavFiles().length, files: getAvailableWavFiles() });
});

app.get("/api/pcg/test-accuracy", async (req, res) => {
  try {
    const PCG_MODEL_URL = process.env.PCG_MODEL_URL;
    if (!PCG_MODEL_URL) return res.status(503).json({ ok: false, error: "PCG_MODEL_URL not set" });
    const axios    = require("axios");
    const baseUrl  = PCG_MODEL_URL.replace(/\/predict$/, "");
    const response = await axios.get(`${baseUrl}/test-with-labels`, { timeout: 120000 });
    res.json({ ok: true, data: response.data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   VITALS / REPORTS
   ═══════════════════════════════════════════════════════════════════════════ */
app.get("/api/vitals/recent", validateRecentVitalsQuery, async (req, res) => {
  try {
    const minutes  = parseInt(req.query.minutes) || 5;
    const deviceId = req.query.deviceId || null;
    const vitals   = await getRecentVitals(minutes, deviceId);
    res.json({ ok: true, data: { time_range_minutes: minutes, count: vitals.length, vitals } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/vitals/send-to-doctor", validateSendToDoctor, async (req, res) => {
  try {
    const { deviceId = null, minutes = 5, format = "json", email = null } = req.body;
    const vitals = await getRecentVitals(minutes, deviceId);
    if (vitals.length === 0) return res.status(404).json({ ok: false, error: "No vitals data" });
    const opts = { deviceId, minutes };
    if (format === "json") {
      const report   = generateJsonReport(vitals, opts);
      const filepath = saveReportToFile(report, "json", deviceId || "device");
      return res.json({ ok: true, format: "json", data: report,
        file: { download_url: `/api/vitals/download/${path.basename(filepath)}` } });
    }
    if (format === "email") {
      const textReport  = generateTextReport(vitals, opts);
      const emailResult = await sendReportViaEmail(textReport, email, opts);
      return res.json({ ok: emailResult.success, message: emailResult.message });
    }
    const textReport = generateTextReport(vitals, opts);
    const filepath   = saveReportToFile(textReport, "txt", deviceId || "device");
    res.json({ ok: true, format: "text", data: textReport,
      file: { download_url: `/api/vitals/download/${path.basename(filepath)}` } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/vitals/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, "reports", filename);
    if (!filename.match(/^vitals_report_.*\.(json|txt)$/)) return res.status(400).json({ ok: false, error: "Invalid filename" });
    if (!fs.existsSync(filepath)) return res.status(404).json({ ok: false, error: "Not found" });
    res.download(filepath);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/vitals/stats", async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ ok: true, data: stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const stats = await getStats();
    res.json({
      status:    "ok",
      timestamp: new Date().toISOString(),
      services: {
        bp_model:  process.env.ML_MODEL_URL  || "disabled",
        pcg_model: process.env.PCG_MODEL_URL || "disabled",
      },
      activePatientId:  activePatientId || "none",
      connectedSockets: socketPatientMap.size,
      database:  { connected: true, totalReadings: stats.totalReadings },
      pcg:       { wav_files_available: getAvailableWavFiles().length },
    });
  } catch (err) {
    res.json({ status: "degraded", error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   SOCKET.IO
   ═══════════════════════════════════════════════════════════════════════════ */
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  if (latestReading) {
    socket.emit("new_reading", latestReading);
    socket.emit("newReading",  latestReading);
  }

  // ── Patient registers their UID when dashboard opens ──────────────────────
  socket.on("register_patient", ({ patientId } = {}) => {
    if (!patientId) return;
    socketPatientMap.set(socket.id, patientId);
    activePatientId = patientId;
    console.log(`👤 Patient registered: ${patientId}`);
    socket.emit("patient_registered", {
      ok: true, patientId,
      message: "Device linked. Readings will be saved to your account.",
    });
  });

  socket.on("disconnect", () => {
    const pid = socketPatientMap.get(socket.id);
    if (pid) {
      socketPatientMap.delete(socket.id);
      const stillActive = [...socketPatientMap.values()].includes(pid);
      if (!stillActive && activePatientId === pid) activePatientId = null;
      console.log(`👤 Patient disconnected: ${pid}`);
    }
    console.log("❌ Socket disconnected:", socket.id);
  });

  socket.on("join_room",    (data) => console.log("Room joined:", data));
  socket.on("chat_message", (data) => socket.broadcast.emit("chat_message", data));
});

/* ═══════════════════════════════════════════════════════════════════════════
   START
   ═══════════════════════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅ Backend   : http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.IO : ready`);
  console.log(`🩺 BP Model  : ${process.env.ML_MODEL_URL  || "not configured"}`);
  console.log(`💓 PCG Model : ${process.env.PCG_MODEL_URL || "not configured"}`);
  console.log(`\n📋 Key endpoints:`);
  console.log(`   POST /api/readings`);
  console.log(`   GET  /api/patient-readings/:patientId`);
  console.log(`   GET  /api/patient-readings/:patientId/latest\n`);
});