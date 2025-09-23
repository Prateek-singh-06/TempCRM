const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Attempting to connect to the database...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Optional: run a simple query
    const userCount = await prisma.users.count();
    console.log(`Found ${userCount} users in the database.`);

  } catch (error) {
    console.error('❌ Failed to connect to the database.');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
}

main();
