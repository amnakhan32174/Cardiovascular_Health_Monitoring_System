require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { predictBP } = require("./services/mlService");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Store last reading
let latestReading = null;

/* =========================
   API: RECEIVE SENSOR DATA FROM ESP32
   ========================= */
app.post("/api/readings", async (req, res) => {
  try {
    const packet = req.body || {};

    console.log("\n📥 Raw Arduino packet:", JSON.stringify(packet, null, 2));

    /* ---------- Normalize incoming data ---------- */
    const normalized = {
      deviceId: packet.deviceId || "esp32-device",
      timestamp: new Date().toISOString(),

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

    console.log("✅ Normalized packet:", JSON.stringify(normalized, null, 2));

    /* ---------- Call ML model for BP prediction ---------- */
    const bpPrediction = await predictBP(normalized);

    if (bpPrediction && bpPrediction.mean_bp) {
      // Convert mean BP to SBP/DBP (rough estimation)
      // Mean BP ≈ DBP + (SBP - DBP)/3
      // So: SBP ≈ 3 * (Mean BP - DBP) + DBP
      // We'll estimate: SBP = Mean BP * 1.3, DBP = Mean BP * 0.7
      normalized.sbp = Math.round(bpPrediction.mean_bp * 1.33);
      normalized.dbp = Math.round(bpPrediction.mean_bp * 0.67);
      normalized.mean_bp = bpPrediction.mean_bp;
      console.log(`🩺 BP Predicted: ${normalized.sbp}/${normalized.dbp} (Mean: ${normalized.mean_bp})`);
    } else {
      console.warn("⚠️ BP prediction unavailable");
    }

    latestReading = normalized;

    /* ---------- Send to frontend via Socket.IO ---------- */
    io.emit("new_reading", normalized);
    io.emit("newReading", normalized); // Support both event names

    res.json({
      ok: true,
      message: "Reading received successfully",
      data: normalized
    });

  } catch (err) {
    console.error("❌ /api/readings error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/* =========================
   HEALTH CHECK
   ========================= */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mlModelUrl: process.env.ML_MODEL_URL || "disabled",
    latestReading: latestReading || "none"
  });
});

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