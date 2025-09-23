const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateWorkingPipelines() {
  try {
    console.log('Starting migration of working pipelines to immediate sales...');

    // Get all pipelines with working statuses
    const workingStatuses = [
      'PRODUCTION_STARTED',
      'QUALITY_CHECK',
      'PACKING_SHIPPING',
      'SHIPPED'
    ];

    const workingPipelines = await prisma.pipelines.findMany({
      where: {
        status: {
          in: workingStatuses
        }
      },
      include: {
        users: { select: { name: true, email: true } },
        companies: { select: { name: true } },
        opportunities: { select: { name: true } }
      }
    });

    console.log(`Found ${workingPipelines.length} working pipelines`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const pipeline of workingPipelines) {
      // Check if immediate sales entry already exists for this pipeline
      // Since projectId is null for pipeline-related immediate sales, check by matching key data
      const existingImmediateSale = await prisma.immediate_sales.findFirst({
        where: {
          projectId: null, // Pipeline-related immediate sales have null projectId
          ownerId: pipeline.ownerId,
          contractor: pipeline.companies?.name || pipeline.name,
          valueOfOrder: pipeline.orderValue || 0
        }
      });

      if (existingImmediateSale) {
        console.log(`Pipeline ${pipeline.id} already has immediate sales entry ${existingImmediateSale.id} - skipping`);
        skippedCount++;
        continue;
      }

      // Create immediate sales entry
      const immediateSaleData = {
        projectId: null, // Pipelines are not projects, so don't link to projects table
        ownerId: pipeline.ownerId,
        contractor: pipeline.companies?.name || pipeline.name,
        sizeClass: pipeline.diameter || 'N/A',
        km: null, // Not applicable for pipeline
        mt: pipeline.quantity || null,
        valueOfOrder: pipeline.orderValue || 0,
        quotationDate: pipeline.orderDate || new Date(),
        status: 'ONGOING', // Active working status
        pic: pipeline.users?.name || null,
        updatedAt: new Date()
      };

      console.log(`Creating immediate sales entry for pipeline ${pipeline.id}:`, immediateSaleData);

      const immediateSale = await prisma.immediate_sales.create({
        data: immediateSaleData
      });

      console.log(`Created immediate sales entry ${immediateSale.id} for pipeline ${pipeline.id}`);
      migratedCount++;
    }

    console.log(`\nMigration completed:`);
    console.log(`- Migrated: ${migratedCount} pipelines`);
    console.log(`- Skipped: ${skippedCount} pipelines (already had immediate sales)`);

    // Verify the migration
    console.log('\nVerifying migration...');
    const verification = await prisma.pipelines.findMany({
      where: {
        status: {
          in: workingStatuses
        }
      },
      select: {
        id: true,
        name: true,
        status: true
      }
    });

    const linkedCount = await prisma.immediate_sales.count({
      where: {
        projectId: {
          in: verification.map(p => p.id)
        }
      }
    });

    console.log(`Working pipelines: ${verification.length}`);
    console.log(`Immediate sales linked to working pipelines: ${linkedCount}`);

    if (verification.length === linkedCount) {
      console.log('✅ Migration successful - all working pipelines now have immediate sales entries');
    } else {
      console.log('⚠️  Migration incomplete - some working pipelines still missing immediate sales');
    }

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateWorkingPipelines();
