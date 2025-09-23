// Test script to verify velocity calculation fixes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVelocityCalculation() {
  try {
    console.log('Testing velocity calculation...\n');

    // Test 1: Get pipeline data
    const pipelines = await prisma.pipelines.findMany({
      where: {
        status: {
          in: ['PROJECT_COMPLETE', 'PAYMENT_RECEIVED']
        }
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        orderValue: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    });

    console.log(`Found ${pipelines.length} closed deals\n`);

    // Test 2: Calculate velocity for different periods
    const now = new Date();
    const periods = [
      { name: 'week', days: 7 },
      { name: 'month', days: 30 },
      { name: 'quarter', days: 90 },
      { name: 'year', days: 365 }
    ];

    periods.forEach(period => {
      const periodStart = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
      const recentClosedDeals = pipelines.filter(deal => deal.updatedAt >= periodStart);
      const daysInPeriod = Math.max((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24), 1);
      const velocity = (recentClosedDeals.length / daysInPeriod) * 30;

      console.log(`${period.name.toUpperCase()} (${period.days} days):`);
      console.log(`  Closed deals in period: ${recentClosedDeals.length}`);
      console.log(`  Days in period: ${daysInPeriod.toFixed(1)}`);
      console.log(`  Velocity (deals/month): ${velocity.toFixed(2)}\n`);
    });

    // Test 3: Check data consistency
    const totalClosed = pipelines.length;
    const last30Days = pipelines.filter(deal => {
      const daysSinceUpdate = (now.getTime() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 30;
    });

    console.log('DATA CONSISTENCY CHECK:');
    console.log(`Total closed deals: ${totalClosed}`);
    console.log(`Closed in last 30 days: ${last30Days.length}`);
    console.log(`Old calculation (total/30): ${(totalClosed / 30).toFixed(2)} deals/month`);
    console.log(`New calculation: ${(last30Days.length / 30).toFixed(2)} deals/month`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVelocityCalculation();
