// services/mlService.js

const axios = require("axios");

const ML_MODEL_URL = process.env.ML_MODEL_URL;

/**
 * Preprocesses sensor data to match training format
 */
function preprocessData(sensorData) {
  // Your model was trained on windows of 125 samples
  const REQUIRED_LENGTH = 125;

  let ppg = sensorData.ppg || [];
  let ecg = sensorData.ecg || [];

  // Pad or truncate to required length
  ppg = padOrTruncate(ppg, REQUIRED_LENGTH);
  ecg = padOrTruncate(ecg, REQUIRED_LENGTH);

  // Normalize PPG (Min-Max normalization like in training)
  ppg = normalizeMinMax(ppg);

  // Normalize ECG (Z-score normalization like in training)
  ecg = normalizeZScore(ecg);

  return { ppg, ecg };
}

function padOrTruncate(arr, targetLength) {
  if (arr.length === 0) {
    // Return array of zeros if empty
    return new Array(targetLength).fill(0);
  }

  if (arr.length > targetLength) {
    // Truncate
    return arr.slice(0, targetLength);
  }

  if (arr.length < targetLength) {
    // Pad with last value or zeros
    const padValue = arr[arr.length - 1] || 0;
    return [...arr, ...new Array(targetLength - arr.length).fill(padValue)];
  }

  return arr;
}

function normalizeMinMax(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min;

  if (range === 0) return arr.map(() => 0);

  return arr.map(val => (val - min) / range);
}

function normalizeZScore(arr) {
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  const std = Math.sqrt(variance) + 1e-8; // Avoid division by zero

  // Light scaling like in training (divide by 2)
  return arr.map(val => (val - mean) / (std * 2));
}

async function predictBP(sensorData) {
  if (!ML_MODEL_URL || typeof ML_MODEL_URL !== "string" || !ML_MODEL_URL.startsWith("http")) {
    console.log("⚠️ ML_MODEL_URL not configured, skipping BP prediction");
    return null;
  }

  try {
    // Preprocess data
    const { ppg, ecg } = preprocessData(sensorData);

    // Payload for FastAPI
    const payload = {
      ppg: ppg,
      ecg: ecg
    };

    console.log("📤 Sending to ML model:", {
      url: ML_MODEL_URL,
      ppg_length: ppg.length,
      ecg_length: ecg.length,
      ppg_sample: ppg.slice(0, 5),
      ecg_sample: ecg.slice(0, 5)
    });

    const response = await axios.post(
      ML_MODEL_URL,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      }
    );

    console.log("✅ ML model response:", response.data);

    return {
      mean_bp: response.data.mean_bp || response.data.bp || response.data.prediction
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error("❌ BP prediction failed: ML model not running on", ML_MODEL_URL);
    } else {
      console.error("❌ BP prediction failed:", error.message);
    }
    return null;
  }
}

module.exports = {
  predictBP
};