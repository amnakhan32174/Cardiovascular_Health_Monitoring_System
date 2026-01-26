// backend/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

// LowDB setup
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { readings: [] };
  await db.write();
}
initDB();

// In-memory buffers for smoothing per device (keeps last N values)
const deviceBuffers = {};
const SMOOTH_WINDOW = 5; // number of samples for simple moving average (tweakable)

// helper to add to buffer and compute SMA
function addToBuffer(deviceId, field, value) {
  deviceBuffers[deviceId] ||= { hr: [], spo2: [] };
  const buf = deviceBuffers[deviceId][field];
  buf.push(value);
  if (buf.length > SMOOTH_WINDOW) buf.shift();
  const sum = buf.reduce((s, v) => s + v, 0);
  return Math.round(sum / buf.length);
}

// Endpoint to receive sensor readings
app.post('/api/readings', async (req, res) => {
  try {
    const packet = req.body || {};
    // ensure consistent fields
    packet.deviceId = packet.deviceId || packet.device_id || 'esp32';
    packet.hr = packet.hr !== undefined ? Number(packet.hr) : null;
    packet.spo2 = packet.spo2 !== undefined ? Number(packet.spo2) : null;
    packet.sbp = packet.sbp !== undefined ? Number(packet.sbp) : null;
    packet.dbp = packet.dbp !== undefined ? Number(packet.dbp) : null;

    // attach server timestamp (ISO)
    packet.timestamp = new Date().toISOString();

    // compute smoothed values (simple moving average)
    const smoothed = {};
    if (packet.hr !== null) smoothed.smoothed_hr = addToBuffer(packet.deviceId, 'hr', packet.hr);
    if (packet.spo2 !== null) smoothed.smoothed_spo2 = addToBuffer(packet.deviceId, 'spo2', packet.spo2);

    // Call optional model server (if running)
    let modelRes;
    try {
      modelRes = await axios.post('http://localhost:5000/predict', { payload: packet }, { timeout: 2000 });
    } catch (err) {
      modelRes = { data: mockPredict(packet) };
    }

    packet.prediction = modelRes.data;
    // merge smoothed into packet for broadcasting
    Object.assign(packet, smoothed);

    // Store in DB (raw + prediction + timestamp)
    await db.read();
    db.data.readings.unshift(packet);
    db.data.readings = db.data.readings.slice(0, 5000); // keep last 5000 for safety
    await db.write();

    // Broadcast to frontend via Socket.IO
    io.emit('new_reading', packet);

    res.json({ ok: true, packet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Fetch last readings
app.get('/api/readings', async (req, res) => {
  await db.read();
  res.json(db.data.readings.slice(0, 200));
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Mock predictor
function mockPredict(packet) {
  const hr = packet.hr || 70;
  const spo2 = packet.spo2 || 98;
  const sbp = Math.round(90 + 0.6 * hr + (100 - spo2) * 0.2);
  const dbp = Math.round(60 + 0.2 * hr);

  let risk = 'normal';
  if (sbp >= 140 || dbp >= 90) risk = 'hypertension';
  if (sbp < 90 || dbp < 60) risk = 'hypotension';

  return { sbp, dbp, risk, confidence: 0.5 };
}

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
