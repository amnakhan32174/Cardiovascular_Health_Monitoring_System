// Test script to directly test your Colab model
// This helps debug what format your Colab model expects

const axios = require('axios');

// Your Colab model URL
const COLAB_URL = 'https://nonrationalistic-dawn-topical.ngrok-free.dev/predict';

async function testColabDirect() {
  console.log('🧪 Testing Colab Model Directly...\n');
  console.log('URL:', COLAB_URL);
  
  // Test different payload formats
  const testCases = [
    {
      name: 'ECG Signal Array Only',
      payload: {
        ecg_signal: [0.1, 0.2, 0.15, 0.3, 0.25, 0.2, 0.18, 0.22, 0.19, 0.21]
      }
    },
    {
      name: 'ECG Signal with Metadata',
      payload: {
        ecg_signal: [0.1, 0.2, 0.15, 0.3, 0.25, 0.2, 0.18, 0.22, 0.19, 0.21],
        heart_rate: 85,
        sample_rate: 250
      }
    },
    {
      name: 'Nested Data Format',
      payload: {
        data: {
          ecg_signal: [0.1, 0.2, 0.15, 0.3, 0.25, 0.2, 0.18, 0.22, 0.19, 0.21]
        }
      }
    },
    {
      name: 'Direct Array (if model expects just array)',
      payload: [0.1, 0.2, 0.15, 0.3, 0.25, 0.2, 0.18, 0.22, 0.19, 0.21]
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📤 Testing: ${testCase.name}`);
      console.log('   Payload:', JSON.stringify(testCase.payload).substring(0, 100) + '...');
      
      const response = await axios.post(COLAB_URL, testCase.payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // Bypass ngrok browser warning
        }
      });
      
      console.log('   ✅ SUCCESS!');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      console.log('\n   🎉 This format works! Use this format in mlService.js');
      break;
      
    } catch (error) {
      console.log(`   ❌ Failed`);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Error:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('   Error:', error.message);
      }
    }
  }
  
  console.log('\n💡 If all tests failed:');
  console.log('   1. Check your Colab notebook is running');
  console.log('   2. Check the ngrok URL is correct');
  console.log('   3. Check your Colab endpoint expects this format');
  console.log('   4. Look at Colab notebook output for error messages');
}

testColabDirect();
