// backend/server.js
// Load environment variables (optional - works without .env file)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, continue without it
  console.log('Note: dotenv not installed. Using default/process.env values.');
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mlService = require('./services/mlService');

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
app.post('/api/readings', async (req, res) => {
  try {
    const packet = req.body || {};
    
    // Ensure consistent fields and add timestamp
    packet.deviceId = packet.deviceId || packet.device_id || 'device-001';
    packet.timestamp = packet.timestamp || new Date().toISOString();
    packet.hr = packet.hr !== undefined ? Number(packet.hr) : null;
    packet.spo2 = packet.spo2 !== undefined ? Number(packet.spo2) : null;
    packet.sbp = packet.sbp !== undefined ? Number(packet.sbp) : null;
    packet.dbp = packet.dbp !== undefined ? Number(packet.dbp) : null;
    packet.blood_sugar = packet.blood_sugar !== undefined ? Number(packet.blood_sugar) : null;
    packet.ecg_data = packet.ecg_data || packet.ecg || null;
    
    // Get ML prediction (async, non-blocking)
    let mlPrediction = null;
    try {
      mlPrediction = await mlService.getMLPrediction(packet);
      packet.mlPrediction = mlPrediction;
      console.log('ML Prediction:', mlPrediction);
    } catch (mlError) {
      console.error('ML Prediction failed (continuing without it):', mlError.message);
      // Continue without ML prediction - don't fail the entire request
    }
    
    latestReading = packet;
    
    // Emit to all connected clients with ML prediction
    io.emit('newReading', packet);
    io.emit('new_reading', packet); // Support both event names for compatibility
    
    res.json({ 
      message: 'Reading received successfully', 
      data: packet,
      prediction: mlPrediction
    });
  } catch (error) {
    console.error('Error processing reading:', error);
    res.status(500).json({ 
      error: 'Failed to process reading', 
      message: error.message 
    });
  }
});

// Simple test route
app.get('/', (req, res) => {
  res.send('Cardio Dashboard Backend is running 🚀');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mlModelUrl: process.env.ML_MODEL_URL || 'Not configured'
  });
});

// ML Prediction endpoint - Get prediction for sensor data
app.post('/api/predict', async (req, res) => {
  try {
    const sensorData = req.body;
    
    if (!sensorData) {
      return res.status(400).json({ 
        error: 'Sensor data is required',
        message: 'Please provide sensor readings in the request body'
      });
    }
    
    console.log('Prediction request received:', sensorData);
    
    const prediction = await mlService.getMLPrediction(sensorData);
    
    res.json({
      success: true,
      prediction: prediction,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      error: 'Prediction failed',
      message: error.message,
      // Return fallback prediction
      prediction: mlService.getFallbackPrediction(req.body, error)
    });
  }
});

// Get latest reading with prediction
app.get('/api/readings/latest', (req, res) => {
  res.json({
    reading: latestReading,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle room joining for chat
  socket.on('join_room', (data) => {
    const room = `room_${data.userId}`;
    socket.join(room);
    console.log(`User ${data.userId} joined room ${room}`);
  });

  // Handle chat messages
  socket.on('chat_message', (data) => {
    // Broadcast to all clients (in production, filter by room)
    io.emit('chat_message', {
      ...data,
      id: Date.now(),
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));

