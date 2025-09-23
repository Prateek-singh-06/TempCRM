const { PrismaClient } = require('@prisma/client');

async function testLeadsQuery() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testing leads database query...');

    // Test basic leads query
    const leads = await prisma.leads.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        source: true,
        status: true,
        qualificationStage: true,
        nextFollowUpDate: true,
        email: true,
        phone: true,
        note: true,
        createdDate: true,
        eventDetails: true,
        users: {
          select: { name: true, email: true, employeeCode: true, role: true },
        },
        companies: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdDate: "desc" },
    });

    console.log('✅ Found', leads.length, 'leads');
    console.log('Sample lead:', JSON.stringify(leads[0], null, 2));

  } catch (error) {
    console.error('❌ Database query error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeadsQuery();
