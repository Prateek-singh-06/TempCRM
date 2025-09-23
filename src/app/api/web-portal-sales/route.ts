import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
// Using Prisma directly for web portal sales
import { prisma } from "@/lib/prisma";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      // Fetch real user data from database
      const prisma = (await import("@/lib/prisma")).prisma;
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          role: true,
          verified: true,
          createdAt: true
        }
      });

      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/web-portal-sales - Get web portal sales analytics
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const showPerformance = searchParams.get('showPerformance') === 'true';

    if (showPerformance) {
      // Get all records for detailed analytics
      const allRecords = await getWebPortalSalesRecords(month);

      // Calculate performance summary
      const performanceSummary = calculatePerformanceSummary(allRecords);

      // Calculate monthly trends
      const monthlyTrends = allRecords.reduce((acc, record) => {
        if (!acc[record.month]) {
          acc[record.month] = {
            month: record.month,
            expectedSales: 0,
            actualSales: 0,
            variance: 0,
            performanceRatio: 0
          };
        }

        acc[record.month].expectedSales += record.expectedSalesValue || 0;
        acc[record.month].actualSales += record.actualSalesValue || 0;

        const expected = acc[record.month].expectedSales;
        const actual = acc[record.month].actualSales;
        acc[record.month].variance = actual - expected;
        acc[record.month].performanceRatio = expected > 0 ? (actual / expected) * 100 : 0;

        return acc;
      }, {} as Record<string, {
        month: string;
        expectedSales: number;
        actualSales: number;
        variance: number;
        performanceRatio: number;
      }>);

      // Calculate performance status distribution
      const performanceStatusCount = allRecords.reduce((acc, record) => {
        const status = record.performanceStatus || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate trend analysis
      const sortedMonths = Object.keys(monthlyTrends).sort();
      const trendAnalysis = {
        improving: false,
        declining: false,
        stable: false,
        growthRate: 0
      };

      if (sortedMonths.length >= 2) {
        const recentMonths = sortedMonths.slice(-2);
        const currentMonth = monthlyTrends[recentMonths[1]];
        const previousMonth = monthlyTrends[recentMonths[0]];

        if (currentMonth && previousMonth) {
          const currentRatio = currentMonth.performanceRatio;
          const previousRatio = previousMonth.performanceRatio;
          trendAnalysis.growthRate = ((currentRatio - previousRatio) / previousRatio) * 100;

          if (trendAnalysis.growthRate > 5) trendAnalysis.improving = true;
          else if (trendAnalysis.growthRate < -5) trendAnalysis.declining = true;
          else trendAnalysis.stable = true;
        }
      }

      return NextResponse.json({
        performanceSummary,
        monthlyTrends: Object.values(monthlyTrends),
        performanceStatusDistribution: performanceStatusCount,
        trendAnalysis,
        insights: {
          overallPerformance: performanceSummary.performanceRatio >= 100 ? 'Excellent' :
                             performanceSummary.performanceRatio >= 80 ? 'Good' :
                             performanceSummary.performanceRatio >= 60 ? 'Average' : 'Needs Improvement',
          bestMonth: performanceSummary.bestPerformingMonth,
          trend: trendAnalysis.improving ? 'Improving' :
                 trendAnalysis.declining ? 'Declining' : 'Stable',
          recommendations: [
            performanceSummary.performanceRatio < 80
              ? 'Sales performance below target - review strategies'
              : null,
            trendAnalysis.declining
              ? 'Recent performance declining - investigate causes'
              : null,
            Object.keys(performanceStatusCount).length > 3
              ? 'Multiple performance statuses indicate inconsistency'
              : null
          ].filter(Boolean)
        }
      });
    }

    // Get filtered records
    const sales = await getWebPortalSalesRecords(month);

    // Calculate enhanced analytics for records
    const enhancedSales = sales.map(record => {
      const variance = (record.actualSalesValue || 0) - (record.expectedSalesValue || 0);
      const performanceRatio = record.expectedSalesValue && record.expectedSalesValue > 0
        ? ((record.actualSalesValue || 0) / record.expectedSalesValue) * 100
        : 0;

      let performanceStatus = record.performanceStatus;
      if (!performanceStatus) {
        if (performanceRatio >= 110) performanceStatus = 'EXCELLENT';
        else if (performanceRatio >= 90) performanceStatus = 'GOOD';
        else if (performanceRatio >= 70) performanceStatus = 'AVERAGE';
        else performanceStatus = 'BELOW_TARGET';
      }

      return {
        ...record,
        variance,
        performanceRatio: Math.round(performanceRatio * 100) / 100,
        performanceStatus,
        isAboveTarget: performanceRatio > 100,
        isBelowTarget: performanceRatio < 80,
        smartInsights: {
          status: performanceStatus,
          variance: variance > 0 ? `$${variance.toLocaleString()} above target` :
                   variance < 0 ? `$${Math.abs(variance).toLocaleString()} below target` :
                   'On target',
          recommendation: performanceRatio > 110 ? 'Exceeding expectations - maintain momentum' :
                         performanceRatio > 90 ? 'Good performance - continue current strategies' :
                         performanceRatio > 70 ? 'Average performance - focus on improvement areas' :
                         'Below target - urgent attention needed'
        }
      };
    });

    // Calculate summary analytics
    const analytics = {
      totalRecords: enhancedSales.length,
      totalExpectedValue: enhancedSales.reduce((sum, s) => sum + (s.expectedSalesValue || 0), 0),
      totalActualValue: enhancedSales.reduce((sum, s) => sum + (s.actualSalesValue || 0), 0),
      totalExpectedCount: enhancedSales.reduce((sum, s) => sum + (s.expectedSalesCount || 0), 0),
      totalActualCount: enhancedSales.reduce((sum, s) => sum + (s.actualSalesCount || 0), 0),
      overallPerformanceRatio: enhancedSales.length > 0
        ? enhancedSales.reduce((sum, s) => sum + s.performanceRatio, 0) / enhancedSales.length
        : 0,
      aboveTargetCount: enhancedSales.filter(s => s.isAboveTarget).length,
      belowTargetCount: enhancedSales.filter(s => s.isBelowTarget).length,
      onTargetCount: enhancedSales.filter(s => !s.isAboveTarget && !s.isBelowTarget).length,
      performanceStatusBreakdown: enhancedSales.reduce((acc, s) => {
        acc[s.performanceStatus] = (acc[s.performanceStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      webPortalSales: enhancedSales,
      analytics,
      insights: {
        overallHealth: analytics.overallPerformanceRatio >= 100 ? 'Healthy' :
                       analytics.overallPerformanceRatio >= 80 ? 'Good' :
                       analytics.overallPerformanceRatio >= 60 ? 'Needs Attention' : 'Critical',
        topPerformers: analytics.aboveTargetCount,
        needsAttention: analytics.belowTargetCount,
        recommendations: [
          analytics.overallPerformanceRatio < 80
            ? `${analytics.belowTargetCount} records below target - review sales strategies`
            : null,
          analytics.aboveTargetCount > analytics.totalRecords * 0.5
            ? 'Strong performance across most records - scale successful strategies'
            : null,
          analytics.totalRecords === 0
            ? 'No sales data available - start tracking web portal performance'
            : null
        ].filter(Boolean)
      }
    });

  } catch (error: unknown) {
    console.error("Error fetching web portal sales:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch web portal sales", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/web-portal-sales - Create new web portal sales record
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      month,
      expectedSalesCount,
      actualSalesCount,
      expectedSalesValue,
      actualSalesValue,
      notes
    } = body;

    // Validate required fields
    if (!name || !month) {
      return NextResponse.json({ error: "Name and month are required" }, { status: 400 });
    }

    // Calculate performance metrics
    const variance = (actualSalesValue || 0) - (expectedSalesValue || 0);
    const performanceRatio = expectedSalesValue && expectedSalesValue > 0
      ? ((actualSalesValue || 0) / expectedSalesValue) * 100
      : 0;

    let performanceStatus = 'UNKNOWN';
    if (performanceRatio >= 110) performanceStatus = 'EXCELLENT';
    else if (performanceRatio >= 90) performanceStatus = 'GOOD';
    else if (performanceRatio >= 70) performanceStatus = 'AVERAGE';
    else performanceStatus = 'BELOW_TARGET';

    const sale = await createWebPortalSale({
      name,
      month,
      expectedSalesCount,
      actualSalesCount,
      expectedSalesValue,
      actualSalesValue,
      notes,
      performanceStatus
    });

    return NextResponse.json({
      success: true,
      webPortalSale: {
        ...sale,
        variance,
        performanceRatio: Math.round(performanceRatio * 100) / 100,
        performanceStatus,
        smartInsights: {
          status: performanceStatus,
          variance: variance > 0 ? `$${variance.toLocaleString()} above target` :
                   variance < 0 ? `$${Math.abs(variance).toLocaleString()} below target` :
                   'On target',
          recommendation: performanceRatio > 110 ? 'Exceeding expectations - maintain momentum' :
                         performanceRatio > 90 ? 'Good performance - continue current strategies' :
                         performanceRatio > 70 ? 'Average performance - focus on improvement areas' :
                         'Below target - urgent attention needed'
        }
      },
      analytics: {
        performanceRatio: Math.round(performanceRatio * 100) / 100,
        status: performanceStatus,
        variance: variance
      },
      message: "Web portal sales record created with smart performance analytics"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error creating web portal sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create web portal sale", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/web-portal-sales/[id] - Update web portal sales record
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Sales record ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const updates = body;

    // Recalculate performance metrics if values changed
    if (updates.actualSalesValue !== undefined || updates.expectedSalesValue !== undefined) {
      const existingRecord = await getWebPortalSaleById(id);
      if (existingRecord) {
        const expectedValue = updates.expectedSalesValue ?? existingRecord.expectedSalesValue ?? 0;
        const actualValue = updates.actualSalesValue ?? existingRecord.actualSalesValue ?? 0;

        const performanceRatio = expectedValue > 0 ? (actualValue / expectedValue) * 100 : 0;

        let performanceStatus = 'UNKNOWN';
        if (performanceRatio >= 110) performanceStatus = 'EXCELLENT';
        else if (performanceRatio >= 90) performanceStatus = 'GOOD';
        else if (performanceRatio >= 70) performanceStatus = 'AVERAGE';
        else performanceStatus = 'BELOW_TARGET';

        updates.performanceStatus = performanceStatus;
      }
    }

    await updateWebPortalSale(id, updates);

    return NextResponse.json({
      success: true,
      message: "Web portal sales record updated with recalculated performance metrics"
    });

  } catch (error: unknown) {
    console.error("Error updating web portal sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update web portal sale", details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper functions for web portal sales using immediate_sales model
interface WebPortalSaleRecord {
  id: string;
  name: string;
  month: string;
  expectedSalesCount?: number;
  actualSalesCount?: number;
  expectedSalesValue?: number;
  actualSalesValue?: number;
  performanceStatus?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

async function getWebPortalSalesRecords(month?: string | null): Promise<WebPortalSaleRecord[]> {
  const where: any = {};
  if (month) {
    // Filter by month if provided - using createdAt for simplicity
    // In a real implementation, you'd have a month field
  }

  const sales = await prisma.immediate_sales.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return sales.map(sale => ({
    id: sale.id.toString(),
    name: sale.contractor || 'Unknown',
    month: sale.createdAt.toISOString().slice(0, 7), // YYYY-MM format
    expectedSalesCount: undefined, // Not in immediate_sales model
    actualSalesCount: undefined, // Not in immediate_sales model
    expectedSalesValue: sale.valueOfOrder || undefined,
    actualSalesValue: sale.valueOfOrder || undefined, // Using same value for both
    performanceStatus: 'GOOD', // Default status
    notes: undefined,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString()
  }));
}

async function createWebPortalSale(data: any): Promise<WebPortalSaleRecord> {
  const sale = await prisma.immediate_sales.create({
    data: {
      ownerId: 1, // Default owner - should be from authenticated user
      contractor: data.name,
      valueOfOrder: data.expectedSalesValue || data.actualSalesValue || 0,
      status: 'BIDDING',
      updatedAt: new Date()
    }
  });

  return {
    id: sale.id.toString(),
    name: data.name,
    month: data.month,
    expectedSalesCount: data.expectedSalesCount,
    actualSalesCount: data.actualSalesCount,
    expectedSalesValue: data.expectedSalesValue,
    actualSalesValue: data.actualSalesValue,
    performanceStatus: data.performanceStatus,
    notes: data.notes,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString()
  };
}

async function getWebPortalSaleById(id: string): Promise<WebPortalSaleRecord | null> {
  const sale = await prisma.immediate_sales.findUnique({
    where: { id: parseInt(id) }
  });

  if (!sale) return null;

  return {
    id: sale.id.toString(),
    name: sale.contractor || 'Unknown',
    month: sale.createdAt.toISOString().slice(0, 7),
    expectedSalesValue: sale.valueOfOrder || undefined,
    actualSalesValue: sale.valueOfOrder || undefined,
    performanceStatus: 'GOOD',
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString()
  };
}

async function updateWebPortalSale(id: string, updates: any): Promise<void> {
  const updateData: any = {};

  if (updates.name) updateData.contractor = updates.name;
  if (updates.expectedSalesValue || updates.actualSalesValue) {
    updateData.valueOfOrder = updates.expectedSalesValue || updates.actualSalesValue || 0;
  }

  await prisma.immediate_sales.update({
    where: { id: parseInt(id) },
    data: updateData
  });
}

function calculatePerformanceSummary(records: WebPortalSaleRecord[]) {
  const totalExpected = records.reduce((sum, r) => sum + (r.expectedSalesValue || 0), 0);
  const totalActual = records.reduce((sum, r) => sum + (r.actualSalesValue || 0), 0);

  const performanceRatio = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

  const bestMonth = records.length > 0
    ? records.reduce((best, current) =>
        ((current.actualSalesValue || 0) > (best.actualSalesValue || 0)) ? current : best
      ).month
    : null;

  return {
    totalRecords: records.length,
    totalExpectedValue: totalExpected,
    totalActualValue: totalActual,
    performanceRatio: Math.round(performanceRatio * 100) / 100,
    bestPerformingMonth: bestMonth,
    averagePerformance: records.length > 0 ? performanceRatio / records.length : 0
  };
}