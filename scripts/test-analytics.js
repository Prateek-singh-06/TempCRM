// Test script for analytics endpoint
const { PrismaClient } = require('@prisma/client');
const jwt = require('jose');

const prisma = new PrismaClient();

async function testAnalyticsEndpoint() {
  try {
    console.log('Testing analytics endpoint...');

    // Get a test user from the database
    const testUser = await prisma.users.findFirst({
      take: 1,
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!testUser) {
      console.log('No users found in database. Please create a user first.');
      return;
    }

    console.log('Found test user:', testUser.email);

    // Create a JWT token for the test user
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'CRMSecretKey');
    const token = await new jwt.SignJWT({
      userId: testUser.email,
      role: testUser.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);

    console.log('Created JWT token for user');

    // Test the analytics endpoint
    const response = await fetch('http://localhost:3000/api/analytics', {
      method: 'GET',
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Analytics endpoint working!');
      console.log('Response keys:', Object.keys(data));
      console.log('Pipeline data length:', data.pipeline?.length || 0);
    } else {
      const errorData = await response.json();
      console.log('❌ Analytics endpoint failed:', errorData);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAnalyticsEndpoint();
