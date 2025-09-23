// Simple test script to check the leads API endpoint
const fetch = require('node-fetch');

async function testLeadsAPI() {
  try {
    console.log('🧪 Testing leads API endpoint...');

    const response = await fetch('http://localhost:3000/api/leads', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test won't work with authentication without a valid token
        // This is just to check if the endpoint is accessible
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Response:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testLeadsAPI();
