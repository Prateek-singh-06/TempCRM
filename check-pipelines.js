const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPipelines() {
  try {
    console.log('Checking pipelines and immediate sales...');

    // Get all pipelines
    const pipelines = await prisma.pipelines.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        ownerId: true,
        orderValue: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`\nTotal pipelines: ${pipelines.length}`);

    // Group by status
    const statusCounts = pipelines.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\nPipeline status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check working status pipelines specifically
    const workingPipelines = pipelines.filter(p =>
      p.status === 'PRODUCTION_STARTED' ||
      p.status === 'QUALITY_CHECK' ||
      p.status === 'PACKING_SHIPPING' ||
      p.status === 'SHIPPED'
    );

    console.log(`\nWorking status pipelines: ${workingPipelines.length}`);
    workingPipelines.forEach(p => {
      console.log(`  ID: ${p.id}, Name: ${p.name}, Status: ${p.status}`);
    });

    // Check immediate sales
    const immediateSales = await prisma.immediate_sales.findMany({
      select: {
        id: true,
        projectId: true,
        contractor: true,
        status: true,
        createdAt: true,
        ownerId: true,
        valueOfOrder: true
      }
    });

    console.log(`\nTotal immediate sales: ${immediateSales.length}`);
    immediateSales.forEach(s => {
      console.log(`  ID: ${s.id}, ProjectId: ${s.projectId}, Contractor: ${s.contractor}, Status: ${s.status}, OwnerId: ${s.ownerId}, Value: ${s.valueOfOrder}`);
    });

    // Check which immediate sales are linked to pipelines
    const linkedToPipelines = immediateSales.filter(s => s.projectId);
    console.log(`Immediate sales linked to pipelines: ${linkedToPipelines.length}`);

    // Check for working pipelines that don't have immediate sales
    const workingPipelineIds = new Set(workingPipelines.map(p => p.id));
    const linkedPipelineIds = new Set(linkedToPipelines.map(s => s.projectId));

    const missingImmediateSales = workingPipelines.filter(p => !linkedPipelineIds.has(p.id));
    console.log(`\nWorking pipelines missing immediate sales: ${missingImmediateSales.length}`);
    missingImmediateSales.forEach(p => {
      console.log(`  ID: ${p.id}, Name: ${p.name}, Status: ${p.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPipelines();
