const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPipelineRelationship() {
  console.log('=== PIPELINE RELATIONSHIP TEST ===\n');

  try {
    // Test the pipeline count query logic
    console.log('1. Current Pipeline Count Query:');
    const totalPipelines = await prisma.pipelines.count();
    console.log(`   Total pipelines (no filter): ${totalPipelines}`);

    console.log('\n2. Pipeline-Opportunity Relationship Analysis:');
    const pipelinesWithOpportunities = await prisma.pipelines.findMany({
      include: {
        opportunities: {
          select: { id: true, name: true, ownerId: true, leadId: true }
        }
      }
    });

    console.log('   Pipeline-Opportunity relationships:');
    pipelinesWithOpportunities.forEach(pipeline => {
      console.log(`     Pipeline ID: ${pipeline.id}`);
      console.log(`     Opportunity ID: ${pipeline.opportunityId}`);
      console.log(`     Opportunity Name: ${pipeline.opportunities?.name || 'NOT FOUND'}`);
      console.log(`     Opportunity Owner ID: ${pipeline.opportunities?.ownerId || 'NOT FOUND'}`);
      console.log(`     Opportunity Lead ID: ${pipeline.opportunities?.leadId || 'NOT LINKED TO LEAD'}`);
      console.log('     ---');
    });

    console.log('\n3. Opportunity Analysis:');
    const opportunities = await prisma.opportunities.findMany({
      select: { id: true, name: true, ownerId: true, leadId: true }
    });

    console.log(`   Total opportunities: ${opportunities.length}`);
    const opportunitiesWithLeads = opportunities.filter(opp => opp.leadId !== null);
    const opportunitiesWithoutLeads = opportunities.filter(opp => opp.leadId === null);

    console.log(`   Opportunities with leads: ${opportunitiesWithLeads.length}`);
    console.log(`   Opportunities without leads: ${opportunitiesWithoutLeads.length}`);

    console.log('\n   Opportunities without leads:');
    opportunitiesWithoutLeads.forEach(opp => {
      console.log(`     ID: ${opp.id}, Name: ${opp.name}`);
    });

    console.log('\n4. Alternative Pipeline Count Methods:');
    // Method 1: Count pipelines directly
    const method1 = await prisma.pipelines.count();
    console.log(`   Method 1 (direct count): ${method1}`);

    // Method 2: Count via opportunities relationship (current method)
    const pipelinesWithOwners = await prisma.pipelines.findMany({
      include: {
        opportunities: true
      }
    });
    console.log(`   Method 2 (pipelines with opportunity relationship): ${pipelinesWithOwners.length}`);
    console.log(`   Pipelines with valid opportunities: ${pipelinesWithOwners.filter(p => p.opportunities !== null).length}`);

    // Method 3: Count pipelines where opportunity exists
    const method3 = await prisma.pipelines.count({
      where: {
        opportunityId: { not: null }
      }
    });
    console.log(`   Method 3 (via opportunityId): ${method3}`);

  } catch (error) {
    console.error('Error during pipeline relationship test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPipelineRelationship();
