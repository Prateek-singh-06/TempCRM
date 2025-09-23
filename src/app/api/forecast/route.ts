import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { WeightedPipelineService, DealStage, WeightedDeal, PipelineMetrics } from "@/lib/weightedPipeline";

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
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

interface ForecastData {
  period: string;
  totalForecast: number;
  weightedForecast: number;
  confidence: number;
  dealsCount: number;
  stageBreakdown: Record<DealStage, number>;
  monthlyBreakdown: Array<{
    month: string;
    forecast: number;
    weightedForecast: number;
    deals: number;
  }>;
  riskAnalysis: {
    highRiskDeals: number;
    lowConfidenceDeals: number;
    overdueDeals: number;
  };
}

// GET /api/forecast - Generate sales forecast
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'quarter'; // week, month, quarter, year
    const confidence = parseFloat(searchParams.get('confidence') || '0.8'); // 0.5, 0.7, 0.8, 0.9

    // Fetch opportunities for forecasting
    const whereClause: any = {
      stage: {
        notIn: ['CLOSED_WON', 'CLOSED_LOST']
      }
    };

    // For non-admin users, only show their own opportunities
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      whereClause.ownerId = user.id;
    }

    const opportunities = await prisma.opportunities.findMany({
      where: whereClause,
      include: {
        users: { select: { name: true, email: true } },
        companies: { select: { name: true } },
        leads: { select: { name: true } }
      },
      orderBy: { createdDate: 'desc' }
    });

    // Convert to weighted deals
    const weightedDeals: WeightedDeal[] = opportunities.map(opp => {
      const stage = opp.stage as DealStage;
      const daysInStage = Math.floor((Date.now() - new Date(opp.createdDate).getTime()) / (1000 * 60 * 60 * 24));

      const probability = WeightedPipelineService.calculateWeightedProbability(
        stage,
        opp.dealSize || 0,
        daysInStage,
        new Date(opp.updatedAt),
        'MEDIUM'
      );

      const weightedValue = (opp.dealSize || 0) * probability;
      const riskScore = WeightedPipelineService.calculateRiskScore({
        id: opp.id.toString(),
        name: opp.name,
        value: opp.dealSize || 0,
        stage,
        probability,
        weightedValue,
        daysInStage,
        velocityScore: 0,
        riskScore: 0,
        priority: 'MEDIUM',
        lastActivity: new Date(opp.updatedAt),
        ownerId: opp.ownerId.toString()
      });

      const priority = WeightedPipelineService.calculatePriority({
        id: opp.id.toString(),
        name: opp.name,
        value: opp.dealSize || 0,
        stage,
        probability,
        weightedValue,
        daysInStage,
        velocityScore: 0,
        riskScore,
        priority: 'MEDIUM',
        lastActivity: new Date(opp.updatedAt),
        ownerId: opp.ownerId.toString()
      });

      return {
        id: opp.id.toString(),
        name: opp.name,
        value: opp.dealSize || 0,
        stage,
        probability,
        weightedValue,
        expectedCloseDate: opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : undefined,
        daysInStage,
        velocityScore: 0,
        riskScore,
        priority,
        lastActivity: new Date(opp.updatedAt),
        ownerId: opp.ownerId.toString()
      };
    });

    // Generate forecast data
    const forecastData = generateForecast(weightedDeals, period, confidence);

    return NextResponse.json({
      forecast: forecastData,
      deals: weightedDeals,
      period,
      confidence
    });

  } catch (error: unknown) {
    console.error("Error generating forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to generate forecast", details: errorMessage },
      { status: 500 }
    );
  }
}

function generateForecast(deals: WeightedDeal[], period: string, confidence: number): ForecastData {
  const now = new Date();
  let monthsToForecast = 3; // default quarter

  switch (period) {
    case 'week': monthsToForecast = 0.25; break;
    case 'month': monthsToForecast = 1; break;
    case 'quarter': monthsToForecast = 3; break;
    case 'year': monthsToForecast = 12; break;
  }

  // Filter deals that could close within the forecast period
  const relevantDeals = deals.filter(deal => {
    if (!deal.expectedCloseDate) return true; // Include deals without expected close date
    const dealMonth = new Date(deal.expectedCloseDate).getMonth();
    const dealYear = new Date(deal.expectedCloseDate).getFullYear();
    const forecastEndMonth = now.getMonth() + Math.ceil(monthsToForecast);
    const forecastEndYear = now.getFullYear() + Math.floor(forecastEndMonth / 12);

    return dealYear < forecastEndYear ||
           (dealYear === forecastEndYear && dealMonth <= (forecastEndMonth % 12));
  });

  // Calculate total forecasts
  const totalForecast = relevantDeals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedForecast = relevantDeals.reduce((sum, deal) => sum + deal.weightedValue, 0);

  // Apply confidence adjustment
  const confidenceMultiplier = confidence;
  const adjustedWeightedForecast = weightedForecast * confidenceMultiplier;

  // Stage breakdown
  const stageBreakdown = Object.values(DealStage).reduce((acc, stage) => {
    acc[stage] = relevantDeals.filter(deal => deal.stage === stage).length;
    return acc;
  }, {} as Record<DealStage, number>);

  // Monthly breakdown
  const monthlyBreakdown = [];
  for (let i = 0; i < Math.ceil(monthsToForecast); i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const monthDeals = relevantDeals.filter(deal => {
      if (!deal.expectedCloseDate) return false;
      const dealMonth = new Date(deal.expectedCloseDate).getMonth();
      const dealYear = new Date(deal.expectedCloseDate).getFullYear();
      return dealMonth === month.getMonth() && dealYear === month.getFullYear();
    });

    const monthForecast = monthDeals.reduce((sum, deal) => sum + deal.value, 0);
    const monthWeightedForecast = monthDeals.reduce((sum, deal) => sum + deal.weightedValue, 0) * confidenceMultiplier;

    monthlyBreakdown.push({
      month: monthName,
      forecast: monthForecast,
      weightedForecast: monthWeightedForecast,
      deals: monthDeals.length
    });
  }

  // Risk analysis
  const riskAnalysis = {
    highRiskDeals: relevantDeals.filter(deal => deal.riskScore > 70).length,
    lowConfidenceDeals: relevantDeals.filter(deal => deal.probability < 0.3).length,
    overdueDeals: relevantDeals.filter(deal => deal.daysInStage > 90).length
  };

  return {
    period,
    totalForecast,
    weightedForecast: adjustedWeightedForecast,
    confidence: confidence * 100,
    dealsCount: relevantDeals.length,
    stageBreakdown,
    monthlyBreakdown,
    riskAnalysis
  };
}
