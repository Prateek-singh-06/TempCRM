#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupTestUser() {
  try {
    // Check if test user exists
    const existingUser = await prisma.users.findFirst({
      where: { email: 'test@crm.com' }
    });

    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      console.log('User ID:', existingUser.id);
      return existingUser;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    const newUser = await prisma.users.create({
      data: {
        email: 'test@crm.com',
        password: hashedPassword,
        name: 'Test User',
        employeeCode: 'TEST001',
        verified: true,
        role: 'Admin',
        department: 'Sales',
        phone: '9876543210'
      }
    });

    console.log('Test user created successfully!');
    console.log('Email:', newUser.email);
    console.log('Password: Test@123');
    console.log('User ID:', newUser.id);

    // Add some sample data for the test user
    const now = new Date();
    
    // Create sample leads
    const lead1 = await prisma.leads.create({
      data: {
        name: 'Test Lead 1',
        email: 'lead1@example.com',
        mobile: '9876543211',
        company: 'Test Company 1',
        status: 'Interested',
        ownerId: newUser.id,
        createdDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      }
    });

    const lead2 = await prisma.leads.create({
      data: {
        name: 'Test Lead 2',
        email: 'lead2@example.com',
        mobile: '9876543212',
        company: 'Test Company 2',
        status: 'New',
        ownerId: newUser.id,
        createdDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 1 month ago
      }
    });

    // Create sample opportunities
    await prisma.opportunities.create({
      data: {
        name: 'Test Opportunity 1',
        stage: 'QUALIFICATION',
        dealSize: 500000,
        probability: 30,
        closingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        ownerUserId: newUser.id.toString(),
        leadId: lead1.id
      }
    });

    await prisma.opportunities.create({
      data: {
        name: 'Test Opportunity 2',
        stage: 'PROPOSAL',
        dealSize: 750000,
        probability: 60,
        closingDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        ownerUserId: newUser.id.toString(),
        leadId: lead2.id
      }
    });

    // Create sample pipelines
    await prisma.pipelines.create({
      data: {
        name: 'Test Pipeline 1',
        status: 'LEAD_RECEIVED',
        orderValue: 250000,
        progressPercentage: 25,
        ownerId: newUser.id,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      }
    });

    await prisma.pipelines.create({
      data: {
        name: 'Test Pipeline 2',
        status: 'QUOTATION_SUBMITTED',
        orderValue: 450000,
        progressPercentage: 50,
        ownerId: newUser.id,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    });

    await prisma.pipelines.create({
      data: {
        name: 'Test Pipeline 3',
        status: 'PROJECT_IN_PROGRESS',
        orderValue: 600000,
        progressPercentage: 75,
        ownerId: newUser.id,
        createdAt: new Date()
      }
    });

    console.log('Sample data created successfully!');
    
    return newUser;
  } catch (error) {
    console.error('Error setting up test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupTestUser()
  .then(() => {
    console.log('\n✅ Test user setup complete!');
    console.log('You can now login with:');
    console.log('Email: test@crm.com');
    console.log('Password: Test@123');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });