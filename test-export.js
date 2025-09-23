#!/usr/bin/env node

/**
 * Test script for CRM Export functionality
 * Tests both Excel and PDF exports with different report types
 */

const fs = require('fs');
const path = require('path');

// Mock JWT token for testing (you'll need a real token from your login)
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Test configurations
const tests = [
  {
    name: 'Excel Export - All Data',
    url: 'http://localhost:3000/api/export?type=all&format=excel&period=month',
    expectedFile: 'test-export-all.xlsx',
    expectedType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    name: 'PDF Export - Sales Report',
    url: 'http://localhost:3000/api/export?type=opportunities&format=pdf&period=month',
    expectedFile: 'test-export-sales.pdf',
    expectedType: 'application/pdf'
  },
  {
    name: 'Excel Export - Attendance',
    url: 'http://localhost:3000/api/export?type=attendance&format=excel&period=week',
    expectedFile: 'test-export-attendance.xlsx',
    expectedType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    name: 'PDF Export - Analytics',
    url: 'http://localhost:3000/api/export?type=analytics&format=pdf&period=quarter',
    expectedFile: 'test-export-analytics.pdf',
    expectedType: 'application/pdf'
  }
];

async function testExport(test) {
  console.log(`\n📋 Testing: ${test.name}`);
  console.log(`   URL: ${test.url}`);
  
  try {
    const response = await fetch(test.url, {
      method: 'GET',
      headers: {
        'Cookie': `token=${TEST_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ Failed: ${response.status} - ${response.statusText}`);
      console.error(`      Response: ${errorText}`);
      return false;
    }

    const contentType = response.headers.get('content-type');
    console.log(`   ✓ Response received (${response.status})`);
    console.log(`   ✓ Content-Type: ${contentType}`);

    // Verify content type
    if (!contentType.includes(test.expectedType)) {
      console.error(`   ❌ Unexpected content type. Expected: ${test.expectedType}`);
      return false;
    }

    // Save the file
    const buffer = await response.arrayBuffer();
    const outputPath = path.join(__dirname, 'test-exports', test.expectedFile);
    
    // Create test-exports directory if it doesn't exist
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`   ✓ File saved: ${outputPath} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);
    
    // Verify file integrity
    if (test.expectedType.includes('pdf')) {
      const fileContent = Buffer.from(buffer);
      const isPDF = fileContent.toString('ascii', 0, 4) === '%PDF';
      if (!isPDF) {
        console.error('   ❌ Invalid PDF file format');
        return false;
      }
      console.log('   ✓ Valid PDF format confirmed');
    } else if (test.expectedType.includes('spreadsheet')) {
      const fileContent = Buffer.from(buffer);
      // Check for Excel file signature (PK for zip-based format)
      const isExcel = fileContent[0] === 0x50 && fileContent[1] === 0x4B;
      if (!isExcel) {
        console.error('   ❌ Invalid Excel file format');
        return false;
      }
      console.log('   ✓ Valid Excel format confirmed');
    }

    console.log(`   ✅ Test passed: ${test.name}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting CRM Export Tests');
  console.log('================================\n');
  
  if (TEST_TOKEN === 'your-jwt-token-here') {
    console.error('⚠️  WARNING: Please set a valid JWT token in TEST_TOKEN variable');
    console.log('\nTo get a token:');
    console.log('1. Login to your CRM at http://localhost:3000');
    console.log('2. Open browser DevTools > Application > Cookies');
    console.log('3. Copy the value of the "token" cookie');
    console.log('4. Replace TEST_TOKEN in this script\n');
  }

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testExport(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n================================');
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('================================\n');

  if (passed > 0) {
    console.log(`📁 Test files saved in: ${path.join(__dirname, 'test-exports')}/`);
  }
}

// Run tests
runAllTests().catch(console.error);