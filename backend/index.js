// backend/index.js
// Express + Socket.IO server for Cardio Dashboard
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // <-- Node.js adapter

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

// Setup LowDB with default data
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { readings: [] });

async function initDB() {
  await db.read();
  db.data ||= { readings: [] }; // fallback if file empty
  await db.write();
}
initDB();

// Endpoint to receive sensor readings
app.post('/api/readings', async (req, res) => {
  try {
    const packet = req.body;
    packet.received_at = new Date().toISOString();

    // Call optional model server (if running)
    let modelRes;
    try {
      modelRes = await axios.post(
        'http://localhost:5000/predict',
        { payload: packet },
        { timeout: 2000 }
      );
    } catch {
      modelRes = { data: mockPredict(packet) };
    }

    packet.prediction = modelRes.data;

    // Store in DB
    db.data.readings.unshift(packet);
    db.data.readings = db.data.readings.slice(0, 1000); // keep last 1000
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

// Mock predictor if ML model not available
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

// Start server
const PORT = 4000;
server.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));

