// Simple test script for ML prediction endpoint
// Run with: node test_ml_prediction.js

const axios = require('axios');

async function testMLPrediction() {
  try {
    console.log('🧪 Testing ML Prediction Endpoint...\n');
    
    // First, check if backend is running
    console.log('🔍 Checking if backend server is running...');
    try {
      const healthCheck = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
      console.log('   ✅ Backend server is running!');
      console.log('   ML Model URL:', healthCheck.data.mlModelUrl || 'Not configured');
      console.log('');
    } catch (healthError) {
      console.error('   ❌ Backend server is NOT running!');
      console.error('   → Please start it first: node server.js');
      console.error('   → Then run this test again\n');
      process.exit(1);
    }
    
    // Test data with ECG signal
    const testData = {
      hr: 85,
      sbp: 140,
      dbp: 90,
      spo2: 95,
      ecg_data: [
        0.1, 0.2, 0.15, 0.3, 0.25, 0.2, 0.18, 0.22, 0.19, 0.21,
        0.23, 0.17, 0.16, 0.24, 0.26, 0.2, 0.19, 0.21, 0.22, 0.18,
        0.2, 0.25, 0.23, 0.21, 0.19, 0.17, 0.16, 0.18, 0.2, 0.22
      ]
    };
    
    console.log('📤 Sending test data:', {
      hr: testData.hr,
      bp: `${testData.sbp}/${testData.dbp}`,
      spo2: testData.spo2,
      ecg_length: testData.ecg_data.length
    });
    
    const response = await axios.post('http://localhost:5000/api/predict', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('\n✅ Prediction received:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.prediction) {
      const pred = response.data.prediction;
      console.log('\n📊 Summary:');
      console.log(`   Disease: ${pred.disease}`);
      console.log(`   Probability: ${(pred.probability * 100).toFixed(1)}%`);
      console.log(`   Risk Level: ${pred.riskLevel}`);
      if (pred.ecgClass) {
        console.log(`   ECG Class: ${pred.ecgClass}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error Details:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.response) {
      console.error('\n📡 Response from server:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('\n📡 No response received from server');
      console.error('   This usually means:');
      console.error('   - Backend server is not running');
      console.error('   - Wrong URL or port');
      console.error('   - Connection refused');
    } else {
      console.error('\n📡 Request setup error:', error.message);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Is backend server running?');
    console.error('      → Run: node server.js');
    console.error('      → Check: http://localhost:5000/api/health');
    console.error('   2. Check .env file exists and has ML_MODEL_URL');
    console.error('   3. Is your Colab model running?');
    console.error('   4. Check ML_MODEL_URL is accessible');
    
    // Try to check if backend is running
    console.error('\n🔍 Checking backend server...');
    axios.get('http://localhost:5000/api/health')
      .then(res => {
        console.error('   ✅ Backend is running!');
        console.error('   ML Model URL:', res.data.mlModelUrl || 'Not configured');
      })
      .catch(() => {
        console.error('   ❌ Backend server is NOT running!');
        console.error('   → Start it with: node server.js');
      });
  }
}

testMLPrediction();
