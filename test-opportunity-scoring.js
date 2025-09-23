const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testOpportunityScoring() {
  try {
    // Check if we have any immediate_sales records
    const sales = await prisma.immediate_sales.findMany({
      take: 5,
      include: {
        projects: {
          select: {
            competitors: true
          }
        },
        users: {
          include: {
            companies: {
              include: {
                contacts: true,
                leads: {
                  include: {
                    activities: true,
                    daily_follow_ups: {
                      where: {
                        status: 'OVERDUE'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Found ${sales.length} immediate sales records`);
    
    if (sales.length > 0) {
      console.log('Sample sale data:');
      console.log(JSON.stringify(sales[0], null, 2));
      
      // Test the logic from our fix
      const sale = sales[0];
      
      // Calculate urgency based on overdue follow-ups
      const overdueFollowUps = sale.users?.companies.reduce((acc, company) => {
        return acc + company.leads.reduce((acc, lead) => {
          return acc + lead.daily_follow_ups.length;
        }, 0);
      }, 0) || 0;
      
      console.log(`Overdue follow-ups: ${overdueFollowUps}`);
      
      const urgency = overdueFollowUps > 3 ? 'CRITICAL' : 
                     overdueFollowUps > 0 ? 'HIGH' : 
                     30 > 30 ? 'MEDIUM' : 'LOW'; // Using 30 as daysInPipeline for test
      
      console.log(`Urgency: ${urgency}`);
      
      // Determine if we have decision maker access based on contact roles
      const decisionMakerAccess = sale.users?.companies.some(company => 
        company.contacts?.some(contact => 
          contact.designation?.toLowerCase().includes('director') || 
          contact.designation?.toLowerCase().includes('manager') ||
          contact.designation?.toLowerCase().includes('head') ||
          contact.designation?.toLowerCase().includes('chief')
        )
      ) || false;
      
      console.log(`Decision maker access: ${decisionMakerAccess}`);
      
      // Determine relationship strength based on activity and follow-up history
      const totalActivities = sale.users?.companies.reduce((acc, company) => {
        return acc + company.leads.reduce((acc, lead) => {
          return acc + (lead.activities?.length || 0);
        }, 0);
      }, 0) || 0;
      
      console.log(`Total activities: ${totalActivities}`);
      
      const relationshipStrength = totalActivities > 10 ? 'EXCELLENT' :
                                  totalActivities > 5 ? 'STRONG' :
                                  totalActivities > 2 ? 'MODERATE' : 'WEAK';
                                  
      console.log(`Relationship strength: ${relationshipStrength}`);
    } else {
      console.log('No immediate sales records found');
    }
  } catch (error) {
    console.error('Error testing opportunity scoring:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOpportunityScoring();