const axios = require('axios');

/**
 * ML Prediction Service
 * Handles communication with the Google Colab ML model
 */

// Configuration - Update this with your Google Colab model URL
const ML_MODEL_URL = process.env.ML_MODEL_URL || 'http://localhost:8000/predict';

// Timeout for ML model requests (in milliseconds)
const ML_REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Prepare sensor data for ML model input
 * Supports both ECG classification and general cardiovascular prediction
 */
function prepareMLInput(sensorData) {
  const input = {
    // Cardiovascular features
    heart_rate: sensorData.hr || sensorData.heart_rate || null,
    systolic_bp: sensorData.sbp || sensorData.systolic_bp || null,
    diastolic_bp: sensorData.dbp || sensorData.diastolic_bp || null,
    spo2: sensorData.spo2 || sensorData.oxygen_saturation || null,
    blood_sugar: sensorData.blood_sugar || sensorData.glucose || null,
    
    // Additional features (if available)
    age: sensorData.age || null,
    sex: sensorData.sex || null,
    
    // Timestamp
    timestamp: sensorData.timestamp || new Date().toISOString()
  };
  
  // Handle ECG data - ECG classification models typically need raw signal data
  const ecgData = sensorData.ecg_data || sensorData.ecg || null;
  
  if (ecgData) {
    // If ECG data is an array, use it directly
    if (Array.isArray(ecgData)) {
      // Extract voltage values if it's an array of objects
      if (ecgData.length > 0 && typeof ecgData[0] === 'object') {
        input.ecg_signal = ecgData.map(point => 
          point.voltage !== undefined ? point.voltage : 
          point.value !== undefined ? point.value : 
          typeof point === 'number' ? point : 0
        );
      } else {
        // Already an array of numbers
        input.ecg_signal = ecgData;
      }
    } else if (typeof ecgData === 'string') {
      // If it's a JSON string, parse it
      try {
        const parsed = JSON.parse(ecgData);
        input.ecg_signal = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.warn('Failed to parse ECG data string:', e);
      }
    }
    
    // Add ECG metadata
    input.ecg_length = input.ecg_signal ? input.ecg_signal.length : 0;
    input.has_ecg = true;
  }
  
  return input;
}

/**
 * Call the ML model API to get predictions
 * Supports ECG classification models and general cardiovascular models
 * @param {Object} sensorData - Sensor readings from the device
 * @returns {Promise<Object>} - Prediction results
 */
async function getMLPrediction(sensorData) {
  try {
    // Prepare input data for the model
    const mlInput = prepareMLInput(sensorData);
    
    // Determine if this is an ECG-based prediction
    const isECGPrediction = mlInput.has_ecg && mlInput.ecg_signal && mlInput.ecg_signal.length > 0;
    
    console.log(`\n📤 Sending ${isECGPrediction ? 'ECG' : 'vitals'} data to ML model`);
    console.log('   URL:', ML_MODEL_URL);
    console.log('   Input summary:', {
      heart_rate: mlInput.heart_rate,
      bp: `${mlInput.systolic_bp}/${mlInput.diastolic_bp}`,
      spo2: mlInput.spo2,
      ecg_length: mlInput.ecg_length || 0
    });
    
    // Prepare request payload based on model type
    let requestPayload;
    
    if (isECGPrediction) {
      // ECG classification models typically expect:
      // Option 1: Direct ECG signal array
      requestPayload = {
        ecg_signal: mlInput.ecg_signal
      };
      
      console.log('   ECG signal length:', mlInput.ecg_signal.length);
      console.log('   ECG signal sample (first 5):', mlInput.ecg_signal.slice(0, 5));
    } else {
      // General cardiovascular prediction
      requestPayload = {
        data: mlInput
      };
    }
    
    console.log('   Request payload keys:', Object.keys(requestPayload));
    
    // Make request to ML model
    const response = await axios.post(ML_MODEL_URL, requestPayload, {
      timeout: ML_REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning
        // Add authentication if your Colab model requires it
        // 'Authorization': `Bearer ${process.env.ML_API_KEY}`
      }
    });
    
    console.log('ML Model Response:', response.data);
    
    // Parse and format the response
    return formatPredictionResponse(response.data, sensorData, isECGPrediction);
    
  } catch (error) {
    console.error('\n⚠️  ML Model Error Details:');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('   Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('   No response received from ML model');
      console.error('   Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      });
    }
    
    console.error('   ML Model URL:', ML_MODEL_URL);
    console.error('');
    
    // Return fallback prediction if ML model fails
    return getFallbackPrediction(sensorData, error);
  }
}

/**
 * Format the ML model response into a standardized format
 * Handles both ECG classification and general cardiovascular predictions
 */
function formatPredictionResponse(mlResponse, originalData, isECGPrediction = false) {
  // ECG Classification models typically return:
  // - Class labels: "Normal", "Arrhythmia", "Myocardial Infarction", etc.
  // - Class indices: 0, 1, 2, etc.
  // - Probabilities for each class
  
  let prediction = null;
  let probability = null;
  let disease = null;
  let riskLevel = null;
  let confidence = null;
  let ecgClass = null;
  let classProbabilities = null;
  
  // Handle different response formats
  if (mlResponse.prediction !== undefined) {
    prediction = mlResponse.prediction;
    probability = mlResponse.probability || mlResponse.confidence || 0;
  } else if (mlResponse.class !== undefined || mlResponse.class_label !== undefined) {
    prediction = mlResponse.class || mlResponse.class_label;
    probability = mlResponse.confidence || mlResponse.probability || mlResponse.score || 0;
    ecgClass = prediction;
  } else if (mlResponse.result) {
    disease = mlResponse.result.disease || mlResponse.result.prediction || mlResponse.result.class;
    probability = mlResponse.result.risk_score || mlResponse.result.probability || mlResponse.result.confidence || 0;
  } else if (mlResponse.disease) {
    disease = mlResponse.disease;
    probability = mlResponse.probability || mlResponse.confidence || 0;
  } else if (mlResponse.label) {
    // ECG classification format
    disease = mlResponse.label;
    probability = mlResponse.probability || mlResponse.confidence || 0;
    ecgClass = disease;
  } else if (Array.isArray(mlResponse)) {
    // If response is an array (class probabilities)
    const maxIndex = mlResponse.indexOf(Math.max(...mlResponse));
    const classLabels = ['Normal', 'Arrhythmia', 'Myocardial Infarction', 'Other'];
    disease = classLabels[maxIndex] || `Class ${maxIndex}`;
    probability = mlResponse[maxIndex];
    classProbabilities = mlResponse;
  } else if (typeof mlResponse === 'string') {
    // Direct string response
    disease = mlResponse;
    probability = 0.5;
  } else {
    // Default: use the response as-is
    prediction = mlResponse;
    probability = 0.5;
  }
  
  // Map ECG classification labels to disease names
  if (isECGPrediction && ecgClass) {
    const ecgDiseaseMap = {
      'Normal': 'Normal ECG',
      'Arrhythmia': 'Cardiac Arrhythmia',
      'MI': 'Myocardial Infarction',
      'Myocardial Infarction': 'Myocardial Infarction',
      'Abnormal': 'Abnormal ECG',
      'Atrial Fibrillation': 'Atrial Fibrillation',
      'Ventricular Fibrillation': 'Ventricular Fibrillation',
      '0': 'Normal ECG',
      '1': 'Abnormal ECG',
      '2': 'Myocardial Infarction'
    };
    
    disease = ecgDiseaseMap[ecgClass] || ecgClass || disease || 'ECG Classification';
  }
  
  // Determine disease type if not set
  if (!disease) {
    if (typeof prediction === 'number') {
      if (isECGPrediction) {
        const ecgClasses = ['Normal ECG', 'Arrhythmia', 'Myocardial Infarction'];
        disease = ecgClasses[prediction] || `ECG Class ${prediction}`;
      } else {
        disease = prediction === 1 ? 'Cardiovascular Disease' : 'Normal';
      }
    } else if (typeof prediction === 'string') {
      disease = prediction;
    } else {
      disease = isECGPrediction ? 'ECG Classification Pending' : 'Unknown';
    }
  }
  
  // Calculate risk level based on disease type and probability
  if (disease && (disease.includes('Infarction') || disease.includes('Arrhythmia') || disease.includes('Abnormal'))) {
    riskLevel = probability >= 0.7 ? 'High' : probability >= 0.4 ? 'Medium' : 'Low';
  } else if (probability >= 0.8) {
    riskLevel = 'High';
  } else if (probability >= 0.5) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }
  
  return {
    disease: disease,
    probability: Math.round(probability * 100) / 100, // Round to 2 decimal places
    riskLevel: riskLevel,
    confidence: confidence || probability,
    prediction: prediction,
    ecgClass: ecgClass || (isECGPrediction ? disease : null),
    classProbabilities: classProbabilities,
    isECGPrediction: isECGPrediction,
    timestamp: new Date().toISOString(),
    rawResponse: mlResponse // Include raw response for debugging
  };
}

/**
 * Fallback prediction when ML model is unavailable
 * Uses simple rule-based logic
 */
function getFallbackPrediction(sensorData, error) {
  console.warn('Using fallback prediction due to ML model error:', error.message);
  
  const hr = sensorData.hr || sensorData.heart_rate;
  const sbp = sensorData.sbp || sensorData.systolic_bp;
  const dbp = sensorData.dbp || sensorData.diastolic_bp;
  const spo2 = sensorData.spo2;
  
  let riskScore = 0;
  let disease = 'Normal';
  let riskLevel = 'Low';
  
  // Simple rule-based risk assessment
  if (sbp >= 140 || dbp >= 90) {
    riskScore += 0.3;
    disease = 'Hypertension Risk';
  }
  
  if (hr > 100) {
    riskScore += 0.2;
  }
  
  if (spo2 && spo2 < 94) {
    riskScore += 0.3;
    disease = 'Respiratory/Cardiovascular Risk';
  }
  
  if (sbp < 90 || dbp < 60) {
    riskScore += 0.2;
    disease = 'Hypotension Risk';
  }
  
  if (riskScore >= 0.6) {
    riskLevel = 'High';
    disease = 'Cardiovascular Disease Risk';
  } else if (riskScore >= 0.3) {
    riskLevel = 'Medium';
  }
  
  return {
    disease: disease,
    probability: Math.min(riskScore, 0.95),
    riskLevel: riskLevel,
    confidence: 0.5, // Lower confidence for fallback
    prediction: riskScore > 0.5 ? 1 : 0,
    timestamp: new Date().toISOString(),
    isFallback: true,
    error: error.message
  };
}

/**
 * Batch prediction for multiple readings
 */
async function getBatchPredictions(sensorDataArray) {
  const predictions = [];
  
  for (const data of sensorDataArray) {
    try {
      const prediction = await getMLPrediction(data);
      predictions.push(prediction);
    } catch (error) {
      console.error('Error in batch prediction:', error);
      predictions.push(getFallbackPrediction(data, error));
    }
  }
  
  return predictions;
}

module.exports = {
  getMLPrediction,
  getBatchPredictions,
  prepareMLInput,
  formatPredictionResponse,
  getFallbackPrediction
};
