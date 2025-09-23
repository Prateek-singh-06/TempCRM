const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');

    // Check if leads table exists and get its structure
    const leadsTable = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leads'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Leads table columns:');
    if (Array.isArray(leadsTable)) {
      leadsTable.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
      });
    }

    // Check if there are any leads in the table
    const leadCount = await prisma.leads.count();
    console.log(`📊 Total leads in database: ${leadCount}`);

    // Try a simple query to see if note column exists
    try {
      const testLead = await prisma.leads.findFirst({
        select: { id: true, note: true }
      });
      console.log('✅ Note column exists and is accessible');
      console.log('📝 Sample lead note:', testLead?.note);
    } catch (error) {
      console.error('❌ Error accessing note column:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSchema();
