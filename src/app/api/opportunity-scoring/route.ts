import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { OpportunityScoringService, ScoringCriteria } from "@/lib/opportunityScoring";

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

// GET /api/opportunity-scoring - Get opportunity scores for immediate sales
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'score'; // score, priority, risk
    const priority = searchParams.get('priority') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

    // Fetch immediate sales data
    const whereClause: any = {};
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      whereClause.ownerId = user.id;
    }

    const immediateSales = await prisma.immediate_sales.findMany({
      where: whereClause,
      include: {
        projects: {
          select: {
            name: true,
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
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Calculate opportunity scores
    const scoredOpportunities = immediateSales.map(sale => {
      const daysInPipeline = sale.quotationDate
        ? Math.floor((Date.now() - new Date(sale.quotationDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate urgency based on overdue follow-ups
      const overdueFollowUps = sale.users?.companies.reduce((acc, company) => {
        return acc + company.leads.reduce((acc, lead) => {
          return acc + lead.daily_follow_ups.length;
        }, 0);
      }, 0) || 0;
      
      const urgency = overdueFollowUps > 3 ? 'CRITICAL' : 
                     overdueFollowUps > 0 ? 'HIGH' : 
                     daysInPipeline > 30 ? 'MEDIUM' : 'LOW';

      // Determine if we have decision maker access based on contact roles
      const decisionMakerAccess = sale.users?.companies.some(company =>
        company.contacts?.some(contact =>
          contact.role?.toLowerCase().includes('director') ||
          contact.role?.toLowerCase().includes('manager') ||
          contact.role?.toLowerCase().includes('head') ||
          contact.role?.toLowerCase().includes('chief') ||
          contact.role?.toLowerCase().includes('ceo') ||
          contact.role?.toLowerCase().includes('cfo') ||
          contact.role?.toLowerCase().includes('cto')
        )
      ) || false;

      // Determine relationship strength based on activity and follow-up history
      const totalActivities = sale.users?.companies.reduce((acc, company) => {
        return acc + company.leads.reduce((acc, lead) => {
          return acc + (lead.activities?.length || 0);
        }, 0);
      }, 0) || 0;
      
      const relationshipStrength = totalActivities > 10 ? 'EXCELLENT' :
                                  totalActivities > 5 ? 'STRONG' :
                                  totalActivities > 2 ? 'MODERATE' : 'WEAK';

      const criteria: ScoringCriteria = {
        dealSize: sale.valueOfOrder || 0,
        probability: sale.status === 'AWARDED' ? 0.9 : sale.status === 'BIDDING' ? 0.6 : 0.3,
        daysInPipeline,
        competitorCount: sale.projects?.competitors?.split(',').length || 0,
        decisionMakerAccess: decisionMakerAccess,
        budgetApproved: sale.status === 'AWARDED',
        relationshipStrength: relationshipStrength,
        urgency: urgency,
        marketTiming: 'GOOD' // Default assumption
      };

      const score = OpportunityScoringService.calculateOpportunityScore(criteria);

      return {
        ...score,
        id: sale.id.toString(),
        name: sale.projects?.name || `Project Sale ${sale.id}`,
        saleData: sale
      };
    });

    // Sort opportunities
    let sortedOpportunities = scoredOpportunities;
    switch (sortBy) {
      case 'priority':
        sortedOpportunities = scoredOpportunities.sort((a, b) => {
          const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        break;
      case 'risk':
        sortedOpportunities = scoredOpportunities.sort((a, b) => {
          const riskOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        });
        break;
      case 'score':
      default:
        sortedOpportunities = scoredOpportunities.sort((a, b) => b.totalScore - a.totalScore);
        break;
    }

    // Filter by priority if specified
    if (priority) {
      sortedOpportunities = sortedOpportunities.filter(opp => opp.priority === priority);
    }

    // Calculate portfolio metrics
    const portfolioMetrics = OpportunityScoringService.calculatePortfolioMetrics(
      scoredOpportunities.map(opp => ({
        id: opp.id,
        name: opp.name,
        totalScore: opp.totalScore,
        dealSize: opp.dealSize,
        probability: opp.probability,
        urgencyScore: opp.urgencyScore,
        competitionScore: opp.competitionScore,
        relationshipScore: opp.relationshipScore,
        budgetScore: opp.budgetScore,
        timingScore: opp.timingScore,
        priority: opp.priority,
        recommendation: opp.recommendation,
        riskLevel: opp.riskLevel
      }))
    );

    return NextResponse.json({
      opportunities: sortedOpportunities,
      portfolioMetrics,
      totalCount: immediateSales.length,
      filteredCount: sortedOpportunities.length
    });

  } catch (error: unknown) {
    console.error("Error calculating opportunity scores:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to calculate opportunity scores", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/opportunity-scoring - Calculate score for a specific opportunity
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      saleId,
      criteria
    }: {
      saleId?: string;
      criteria: ScoringCriteria
    } = body;

    if (!criteria) {
      return NextResponse.json({ error: "Scoring criteria is required" }, { status: 400 });
    }

    // If saleId is provided, verify ownership
    if (saleId) {
      const sale = await prisma.immediate_sales.findUnique({
        where: { id: parseInt(saleId) }
      });

      if (!sale) {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });
      }

      if (user.role !== 'admin' && user.role !== 'SuperAdmin' && sale.ownerId !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Calculate opportunity score
    const score = OpportunityScoringService.calculateOpportunityScore(criteria);

    return NextResponse.json({
      success: true,
      score: {
        ...score,
        saleId
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error calculating opportunity score:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to calculate opportunity score", details: errorMessage },
      { status: 500 }
    );
  }
}
