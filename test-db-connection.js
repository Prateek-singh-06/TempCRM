const { PrismaClient } = require('@prisma/client');

// Create a new Prisma client with detailed logging
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log all events
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
});

prisma.$on('error', (e) => {
  console.log('Error: ' + e.message);
  console.log('Target: ' + e.target);
});

prisma.$on('info', (e) => {
  console.log('Info: ' + e.message);
});

prisma.$on('warn', (e) => {
  console.log('Warning: ' + e.message);
});

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const result = await prisma.immediate_sales.count();
    console.log(`Found ${result} immediate sales records`);
    
    // Test a more complex query
    const sales = await prisma.immediate_sales.findMany({
      take: 1,
      include: {
        users: true
      }
    });
    
    console.log('Sample sale:', JSON.stringify(sales[0], null, 2));
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }
}

testDatabaseConnection();