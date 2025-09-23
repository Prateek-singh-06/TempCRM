const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Testing database connection...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test a simple query
    const userCount = await prisma.users.count();
    console.log(`📊 Found ${userCount} users in database`);

    // Test another table
    const companyCount = await prisma.companies.count();
    console.log(`📊 Found ${companyCount} companies in database`);

    console.log('🎉 Database is working correctly!');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Please check:');
    console.error('   - DATABASE_URL environment variable');
    console.error('   - Database server is running');
    console.error('   - Database credentials are correct');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
