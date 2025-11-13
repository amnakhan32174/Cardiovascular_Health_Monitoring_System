// backend/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Store recent readings
let latestReading = {};

// REST endpoint to receive sensor data
app.post('/api/readings', (req, res) => {
  latestReading = req.body;
  io.emit('newReading', latestReading);
  res.json({ message: 'Reading received successfully', data: latestReading });
});

// Simple test route
app.get('/', (req, res) => {
  res.send('Cardio Dashboard Backend is running 🚀');
});

// Start server
const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));

