const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateLeadStatus() {
  try {
    console.log('🔄 Starting lead status migration...');

    // Count existing leads with "converted" status
    const convertedLeads = await prisma.leads.findMany({
      where: {
        status: 'converted'
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`📊 Found ${convertedLeads.length} leads with "converted" status`);

    if (convertedLeads.length === 0) {
      console.log('✅ No leads need migration. All good!');
      return;
    }

    // Update all leads with "converted" status to "qualified"
    const result = await prisma.leads.updateMany({
      where: {
        status: 'converted'
      },
      data: {
        status: 'qualified',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Successfully migrated ${result.count} leads from "converted" to "qualified" status`);

    // Verify the migration
    const remainingConverted = await prisma.leads.count({
      where: {
        status: 'converted'
      }
    });

    const qualifiedCount = await prisma.leads.count({
      where: {
        status: 'qualified'
      }
    });

    console.log(`🔍 Verification:`);
    console.log(`   - Remaining "converted" leads: ${remainingConverted}`);
    console.log(`   - Total "qualified" leads: ${qualifiedCount}`);

    if (remainingConverted === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Warning: Some leads still have "converted" status');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateLeadStatus();
