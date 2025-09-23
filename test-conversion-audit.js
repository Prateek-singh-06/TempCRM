const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditConversionRates() {
  console.log('=== CONVERSION RATE AUDIT ===\n');

  try {
    // Test with admin role (no filters)
    const user = { role: 'admin' };

    const leadFilter = user.role === 'admin' ? {} : { ownerId: user.id };
    const opportunityFilter = user.role === 'admin' ? {} : { ownerId: user.id };

    console.log('1. Basic Counts:');
    const totalLeads = await prisma.leads.count({ where: leadFilter });
    console.log(`   Total Leads: ${totalLeads}`);

    const totalOpportunities = await prisma.opportunities.count({ where: opportunityFilter });
    console.log(`   Total Opportunities: ${totalOpportunities}`);

    console.log('\n2. Opportunities with Lead IDs:');
    const opportunitiesWithLead = await prisma.opportunities.findMany({
      where: {
        leadId: { not: null },
        ...opportunityFilter
      },
      select: { leadId: true, id: true, name: true }
    });
    console.log(`   Opportunities with leads: ${opportunitiesWithLead.length}`);

    const uniqueLeadIds = new Set(
      opportunitiesWithLead
        .map(opp => opp.leadId)
        .filter((id) => typeof id === 'number')
    );
    console.log(`   Unique lead IDs converted: ${uniqueLeadIds.size}`);
    console.log(`   Unique lead IDs: [${Array.from(uniqueLeadIds).join(', ')}]`);

    console.log('\n3. Pipeline Count:');
    const pipelineCount = await prisma.pipelines.count({
      where: user.role === 'admin' ? {} : {
        opportunities: {
          ownerId: user.id
        }
      }
    });
    console.log(`   Total Pipelines: ${pipelineCount}`);

    // Get pipeline details
    const pipelines = await prisma.pipelines.findMany({
      where: user.role === 'admin' ? {} : {
        opportunities: {
          ownerId: user.id
        }
      },
      select: { id: true, opportunityId: true, status: true }
    });
    console.log(`   Pipeline details:`, pipelines.map(p => ({
      id: p.id,
      opportunityId: p.opportunityId,
      status: p.status
    })));

    console.log('\n4. Conversion Rate Calculations:');
    const leadToOpportunity = totalLeads > 0 ? (uniqueLeadIds.size / totalLeads) * 100 : 0;
    const opportunityToPipeline = totalOpportunities > 0 ? (pipelineCount / totalOpportunities) * 100 : 0;

    console.log(`   Lead → Opportunity: ${leadToOpportunity.toFixed(2)}%`);
    console.log(`   Opportunity → Pipeline: ${opportunityToPipeline.toFixed(2)}%`);
    console.log(`   Calculation: ${uniqueLeadIds.size}/${totalLeads} = ${leadToOpportunity.toFixed(2)}%`);
    console.log(`   Calculation: ${pipelineCount}/${totalOpportunities} = ${opportunityToPipeline.toFixed(2)}%`);

    console.log('\n5. Sample Data Analysis:');
    console.log('   Sample Leads:');
    const sampleLeads = await prisma.leads.findMany({
      take: 5,
      select: { id: true, name: true, createdDate: true }
    });
    sampleLeads.forEach(lead => {
      console.log(`     ID: ${lead.id}, Name: ${lead.name}, Date: ${lead.createdDate.toISOString().split('T')[0]}`);
    });

    console.log('\n   Sample Opportunities:');
    const sampleOpportunities = await prisma.opportunities.findMany({
      take: 5,
      select: { id: true, name: true, leadId: true, stage: true }
    });
    sampleOpportunities.forEach(opp => {
      console.log(`     ID: ${opp.id}, Name: ${opp.name}, LeadID: ${opp.leadId}, Stage: ${opp.stage}`);
    });

    console.log('\n   Sample Pipelines:');
    const samplePipelines = await prisma.pipelines.findMany({
      take: 5,
      select: { id: true, opportunityId: true, status: true }
    });
    samplePipelines.forEach(pipeline => {
      console.log(`     ID: ${pipeline.id}, OppID: ${pipeline.opportunityId}, Status: ${pipeline.status}`);
    });

  } catch (error) {
    console.error('Error during audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditConversionRates();
