// Test script to verify that sizeDI and quantity fields can be updated in opportunities
const testOpportunityUpdate = async () => {
  console.log('🔍 Testing Size and Quantity field updates in opportunities...\n');

  try {
    // Step 1: Get opportunities
    console.log('📋 Step 1: Fetching opportunities...');
    const response = await fetch('http://localhost:3000/api/opportunities', {
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add a valid JWT token here
        'Cookie': 'token=YOUR_JWT_TOKEN_HERE'
      }
    });

    if (!response.ok) {
      console.log('❌ Cannot connect to server. Make sure development server is running on port 3000.');
      console.log('💡 Run: npm run dev');
      return;
    }

    const data = await response.json();
    const opportunities = data.opportunities;

    if (opportunities.length === 0) {
      console.log('❌ No opportunities found to test with.');
      console.log('💡 Create an opportunity first to test the update functionality.');
      return;
    }

    const testOpp = opportunities[0];
    console.log(`✅ Found opportunity: ${testOpp.id} - ${testOpp.name}`);
    console.log(`   Current sizeDI: "${testOpp.sizeDI || 'null'}"`);
    console.log(`   Current quantity: ${testOpp.quantity || 'null'}\n`);

    // Step 2: Test update
    console.log('📝 Step 2: Testing update with new values...');
    const testSizeDI = 'DN800; DN600; DN500';
    const testQuantity = 2500;

    const updateResponse = await fetch(`http://localhost:3000/api/opportunities/${testOpp.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=YOUR_JWT_TOKEN_HERE'
      },
      body: JSON.stringify({
        sizeDI: testSizeDI,
        quantity: testQuantity
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.log('❌ Update failed:', errorData);
      return;
    }

    console.log('✅ Update request sent successfully!\n');

    // Step 3: Verify update
    console.log('🔍 Step 3: Verifying the update...');
    const verifyResponse = await fetch(`http://localhost:3000/api/opportunities/${testOpp.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=YOUR_JWT_TOKEN_HERE'
      }
    });

    if (!verifyResponse.ok) {
      console.log('❌ Verification failed');
      return;
    }

    const verifyData = await verifyResponse.json();
    const updatedOpp = verifyData.opportunity;

    console.log(`   Updated sizeDI: "${updatedOpp.sizeDI}"`);
    console.log(`   Updated quantity: ${updatedOpp.quantity}\n`);

    // Step 4: Check results
    console.log('🎯 Step 4: Checking results...');
    let passed = true;

    if (updatedOpp.sizeDI !== testSizeDI) {
      console.log(`❌ SizeDI mismatch: Expected "${testSizeDI}", Got "${updatedOpp.sizeDI}"`);
      passed = false;
    } else {
      console.log('✅ SizeDI updated correctly');
    }

    if (updatedOpp.quantity !== testQuantity) {
      console.log(`❌ Quantity mismatch: Expected ${testQuantity}, Got ${updatedOpp.quantity}`);
      passed = false;
    } else {
      console.log('✅ Quantity updated correctly');
    }

    if (passed) {
      console.log('\n🎉 TEST PASSED! Size and Quantity fields are working correctly!');
      console.log('✨ The fix has been successfully implemented.');
    } else {
      console.log('\n❌ TEST FAILED! There may be additional issues to resolve.');
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    console.log('💡 Make sure:');
    console.log('   1. Development server is running: npm run dev');
    console.log('   2. You have valid JWT token');
    console.log('   3. Database is accessible');
  }
};

// Run the test
testOpportunityUpdate();
