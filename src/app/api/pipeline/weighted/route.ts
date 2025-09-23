import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { WeightedPipelineService, DealStage, WeightedDeal, PipelineMetrics, PipelineVelocityMetrics } from "@/lib/weightedPipeline";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      console.error("No token found in cookies");
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET environment variable not set");
      return null;
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    if (!payload.userId) {
      console.error("No userId in JWT payload");
      return null;
    }

    const user = await prisma.users.findUnique({
      where: { email: payload.userId as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      console.error("User not found in database:", payload.userId);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/pipeline/weighted - Get weighted pipeline data
export async function GET(request: Request) {
  try {
    // Authenticate user
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        error: "Unauthorized",
        message: "Authentication required. Please log in."
      }, { status: 401 });
    }

    // Get query parameters (no validation needed for optional period)
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period');
    const finalPeriod = periodParam || 'month';
    console.log('Period parameter received:', periodParam, 'Final period:', finalPeriod);

    const periodStart = resolvePeriodStart(finalPeriod);

    // Fetch pipelines from database
    const whereClause: Record<string, unknown> = {};

    // For non-admin users, only show their own pipelines
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      whereClause.ownerId = user.id;
    }

    if (periodStart) {
      whereClause.OR = [
        { updatedAt: { gte: periodStart } },
        { orderDate: { gte: periodStart } }
      ];
    }

    console.log('Fetching pipelines with whereClause:', whereClause);

    let pipelines;
    try {
      pipelines = await prisma.pipelines.findMany({
        where: whereClause,
        include: {
          users: { select: { name: true, email: true, role: true } },
          companies: { select: { name: true, region: true, type: true } },
          opportunities: {
            select: {
              id: true,
              name: true,
              dealSize: true,
              probability: true,
              classification: true,
              expectedCloseDate: true,
              wonDate: true,
              users: { select: { name: true, email: true } } // Include opportunity owner info
            }
          }
        },
        orderBy: { orderDate: 'desc' }
      });

      console.log(`Successfully fetched ${pipelines.length} pipelines`);
    } catch (dbError) {
      console.error("Database error fetching pipelines:", dbError);
      return NextResponse.json({
        error: "Database error",
        message: "Failed to fetch pipelines from database"
      }, { status: 500 });
    }

    // Convert pipelines to weighted deals
    const now = new Date();
    const weightedDeals: WeightedDeal[] = pipelines.map((pipeline: any) => {
      try {
        // Validate and convert pipeline status to deal stage for compatibility
        let stage: DealStage;
        switch (pipeline.status) {
          case 'ORDER_RECEIVED':
          case 'ORDER_PROCESSING':
          case 'CONTRACT_SIGNING':
            stage = DealStage.PROPOSAL;
            break;
          case 'PRODUCTION_STARTED':
          case 'QUALITY_CHECK':
            stage = DealStage.NEGOTIATION;
            break;
          case 'PACKING_SHIPPING':
          case 'SHIPPED':
            stage = DealStage.FINAL_APPROVAL;
            break;
          case 'DELIVERED':
          case 'INSTALLATION_STARTED':
          case 'INSTALLATION_COMPLETE':
          case 'PAYMENT_RECEIVED':
            stage = DealStage.CLOSED_WON;
            break;
          case 'PROJECT_COMPLETE':
            stage = DealStage.CLOSED_WON;
            break;
          case 'ON_HOLD':
          case 'DELAYED':
            stage = DealStage.ON_HOLD;
            break;
          case 'CANCELLED':
          case 'DISPUTED':
            stage = DealStage.CANCELLED;
            break;
          case 'LOST_TO_COMPETITOR':
            stage = DealStage.LOST_TO_COMPETITOR;
            break;
          default:
            stage = DealStage.PROPOSAL;
        }

        const orderDate = pipeline.orderDate ? new Date(pipeline.orderDate) : new Date(now);
        const pipelineAgeDays = Math.max(1, Math.round((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)));

        const closedWonStatuses = new Set([
          'DELIVERED',
          'INSTALLATION_STARTED',
          'INSTALLATION_COMPLETE',
          'PAYMENT_RECEIVED',
          'PROJECT_COMPLETE'
        ]);

        const closedDateCandidate =
          pipeline.actualInstallDate ||
          pipeline.actualDeliveryDate ||
          pipeline.paymentDate ||
          pipeline.updatedAt;
        const closedDate = closedWonStatuses.has(pipeline.status)
          ? new Date(closedDateCandidate)
          : undefined;

        const salesCycleDays = closedDate
          ? Math.max(1, Math.round((closedDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)))
          : undefined;

        const daysInStage = pipelineAgeDays;

        // Use pipeline order value
        const dealSize = pipeline.orderValue || 0;
        const rawProgress = Number(pipeline.progressPercentage) || 0;
        const normalizedProgress = Math.min(Math.max(rawProgress / 100, 0), 1);

        let probability = normalizedProgress;
        if (probability === 0) {
          probability = WeightedPipelineService.calculateWeightedProbability(
            stage,
            dealSize,
            pipelineAgeDays,
            new Date(pipeline.updatedAt),
            'MEDIUM'
          );
        }
        probability = Math.min(Math.max(probability, 0), 1);

        const weightedValue = dealSize * probability;

        // Calculate risk score based on pipeline status and progress
        let riskScore = 50; // Default medium risk
        if (pipeline.status === 'PROJECT_COMPLETE' || pipeline.status === 'PAYMENT_RECEIVED') {
          riskScore = 10; // Low risk
        } else if (pipeline.status === 'ON_HOLD' || pipeline.status === 'DELAYED' || pipeline.status === 'DISPUTED') {
          riskScore = 80; // High risk
        } else if (pipeline.status === 'CANCELLED' || pipeline.status === 'LOST_TO_COMPETITOR') {
          riskScore = 100; // Maximum risk
        }

        // Calculate priority based on pipeline status and value
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (dealSize > 5000000 || pipeline.status === 'DELAYED' || pipeline.status === 'DISPUTED') {
          priority = 'HIGH';
        } else if (dealSize < 1000000) {
          priority = 'LOW';
        }

        return {
          id: pipeline.id.toString(),
          name: pipeline.name,
          value: dealSize,
          stage,
          probability,
          weightedValue,
          expectedCloseDate: pipeline.expectedDeliveryDate ? new Date(pipeline.expectedDeliveryDate) : undefined,
          daysInStage,
          velocityScore: rawProgress,
          riskScore,
          priority,
          lastActivity: new Date(pipeline.updatedAt),
          ownerId: pipeline.ownerId.toString(),
          ownerName: pipeline.users?.name,
          ownerEmail: pipeline.users?.email,
          // New fields for enhanced display
          companyName: pipeline.companies?.name || undefined,
          classification: pipeline.opportunities?.classification || 'SMALL_BUSINESS',
          diameter: pipeline.diameter || undefined,
          quantity: pipeline.quantity || undefined,
          specification: pipeline.specification || undefined,
          challenges: pipeline.challenges || undefined,
          status: pipeline.status || undefined, // Include pipeline status
          orderDate,
          closedDate,
          pipelineAgeDays,
          salesCycleDays
        };
      } catch (conversionError) {
        console.error(`Error converting pipeline ${pipeline.id}:`, conversionError);
        // Return a default deal if conversion fails
        return {
          id: pipeline.id.toString(),
          name: pipeline.name || 'Unknown Pipeline',
          value: 0,
          stage: DealStage.PROPOSAL,
          probability: 0,
          weightedValue: 0,
          expectedCloseDate: undefined,
          daysInStage: 0,
          velocityScore: 0,
          riskScore: 50,
          priority: 'MEDIUM' as const,
          lastActivity: new Date(pipeline.updatedAt),
          ownerId: pipeline.ownerId.toString(),
          ownerName: pipeline.users?.name,
          ownerEmail: pipeline.users?.email,
          companyName: pipeline.companies?.name || undefined,
          classification: 'SMALL_BUSINESS',
          diameter: undefined,
          quantity: undefined,
          specification: undefined,
          challenges: undefined,
          orderDate: undefined,
          closedDate: undefined,
          pipelineAgeDays: undefined,
          salesCycleDays: undefined
        };
      }
    });

    // Calculate pipeline metrics
    let metrics: PipelineMetrics;
    try {
      metrics = WeightedPipelineService.generatePipelineMetrics(weightedDeals);
      console.log('Pipeline metrics calculated:', {
        totalDeals: metrics.totalDeals,
        weightedValue: metrics.weightedValue
      });
    } catch (metricsError) {
      console.error("Error calculating pipeline metrics:", metricsError);
      // Return default metrics if calculation fails
      const emptyVelocity: PipelineVelocityMetrics = {
        qualifiedDeals: 0,
        averageDealSize: 0,
        winRate: 0,
        salesCycleLengthDays: 0,
        velocityPerDay: 0,
        velocityPerMonth: 0,
        dealsPerMonth: 0,
      };

      metrics = {
        totalDeals: weightedDeals.length,
        totalValue: 0,
        weightedValue: 0,
        averageProbability: 0,
        forecastAccuracy: 0.5,
        velocity: 0,
        velocityDetails: emptyVelocity,
        conversionRate: 0,
        stageDistribution: Object.values(DealStage).reduce((acc, stage) => {
          acc[stage] = 0;
          return acc;
        }, {} as Record<DealStage, number>),
        monthlyForecast: []
      };
    }

    // Generate recommendations
    let recommendations: string[] = [];
    try {
      recommendations = WeightedPipelineService.generateRecommendations(metrics, weightedDeals);
      console.log(`Generated ${recommendations.length} recommendations`);
    } catch (recommendationsError) {
      console.error("Error generating recommendations:", recommendationsError);
      recommendations = ["Unable to generate recommendations due to data processing error"];
    }

    console.log(`Successfully processed ${weightedDeals.length} weighted deals`);

    return NextResponse.json({
      deals: weightedDeals,
      metrics,
      recommendations,
      period: finalPeriod
    });

  } catch (error: unknown) {
    console.error("Critical error in weighted pipeline API:", error);

    // Determine error type and provide appropriate response
    let statusCode = 500;
    let errorMessage = "Internal server error";
    let errorDetails = "An unexpected error occurred while processing your request";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;

      // Check for specific error types
      if (error.message.includes('JWT') || error.message.includes('token')) {
        statusCode = 401;
        errorMessage = "Authentication error";
      } else if (error.message.includes('database') || error.message.includes('prisma')) {
        statusCode = 500;
        errorMessage = "Database error";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        message: "Failed to fetch weighted pipeline data",
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// POST /api/pipeline/weighted - Create or update weighted deal
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      opportunityId,
      stage,
      expectedCloseDate
    } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: "Opportunity ID is required" }, { status: 400 });
    }

    // Update opportunity with weighted data
    const updatedOpportunity = await prisma.opportunities.update({
      where: { id: parseInt(opportunityId) },
      data: {
        stage: stage || undefined,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        users: { select: { name: true, email: true } },
        companies: { select: { name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      opportunity: updatedOpportunity,
      message: "Weighted deal updated successfully"
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error updating weighted deal:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update weighted deal", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/pipeline/weighted - Update pipeline status
export async function PUT(request: Request) {
  try {
    console.log("PUT request received for pipeline status update");

    const user = await getUserFromToken(request);
    if (!user) {
      console.log("User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pipelineId, status } = body;

    console.log("Request body:", { pipelineId, status });

    if (!pipelineId) {
      console.log("Pipeline ID is missing");
      return NextResponse.json({ error: "Pipeline ID is required" }, { status: 400 });
    }

    if (!status) {
      console.log("Status is missing");
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Convert pipelineId to number if it's a string
    const pipelineIdNum = typeof pipelineId === 'string' ? parseInt(pipelineId, 10) : pipelineId;

    if (isNaN(pipelineIdNum)) {
      console.log("Invalid pipeline ID:", pipelineId);
      return NextResponse.json({ error: "Invalid pipeline ID" }, { status: 400 });
    }

    console.log("Looking for pipeline with ID:", pipelineIdNum, "for user:", user.id);

    // Check if pipeline exists and belongs to user
    const existingPipeline = await prisma.pipelines.findFirst({
      where: {
        id: pipelineIdNum,
        ...(user.role !== "admin" && user.role !== "SuperAdmin" && { ownerId: user.id }),
      },
      include: {
        users: { select: { name: true, email: true } },
        companies: { select: { name: true } },
        opportunities: { select: { name: true } }
      }
    });

    if (!existingPipeline) {
      console.log("Pipeline not found:", pipelineIdNum);
      return NextResponse.json({ error: "Pipeline not found or access denied" }, { status: 404 });
    }

    console.log("Found pipeline:", existingPipeline.id, "updating status to:", status);

    // Check if status is PRODUCTION_STARTED (working) - trigger immediate sales creation
    let immediateSaleCreated = false;
    console.log(`Checking status: '${status}' (current: '${existingPipeline.status}')`);
    if (status === 'PRODUCTION_STARTED') {
      try {
        console.log("Status changing to PRODUCTION_STARTED - creating immediate sales entry");
        console.log("Pipeline details:", {
          id: existingPipeline.id,
          name: existingPipeline.name,
          ownerId: existingPipeline.ownerId,
          userId: user.id,
          userRole: user.role
        });

        // Check if immediate sales entry already exists for this pipeline
        // Since projectId is null for pipeline-related immediate sales, check by matching key data
        const existingImmediateSale = await prisma.immediate_sales.findFirst({
          where: {
            projectId: null, // Pipeline-related immediate sales have null projectId
            ownerId: user.id,
            contractor: existingPipeline.companies?.name || existingPipeline.name,
            valueOfOrder: existingPipeline.orderValue || 0
          }
        });

        console.log("Existing immediate sale check result:", existingImmediateSale ? "Found existing" : "No existing found");

        if (!existingImmediateSale) {
          // Create immediate sales entry
          const immediateSaleData = {
            projectId: null, // Pipelines are not projects, so don't link to projects table
            ownerId: user.id, // Use the user who triggered the creation
            contractor: existingPipeline.companies?.name || existingPipeline.name,
            sizeClass: existingPipeline.diameter || 'N/A',
            km: null, // Not applicable for pipeline
            mt: existingPipeline.quantity || null,
            valueOfOrder: existingPipeline.orderValue || 0,
            quotationDate: existingPipeline.orderDate || new Date(),
            status: 'ONGOING' as const, // Active working status
            pic: existingPipeline.users?.name || null,
            updatedAt: new Date()
          };

          console.log("Creating immediate sale with data:", immediateSaleData);

          const immediateSale = await prisma.immediate_sales.create({
            data: immediateSaleData
          });

          console.log("Immediate sales entry created successfully:", immediateSale.id);
          immediateSaleCreated = true;
        } else {
          console.log("Immediate sales entry already exists for this pipeline");
        }
      } catch (immediateSaleError) {
        console.error("Error creating immediate sales entry:", immediateSaleError);
        console.error("Error details:", immediateSaleError instanceof Error ? immediateSaleError.message : immediateSaleError);
        // Don't fail the pipeline update if immediate sales creation fails
      }
    } else {
      console.log(`Status change condition not met: status='${status}', existing='${existingPipeline.status}'`);
    }

    // Update pipeline status
    const updatedPipeline = await prisma.pipelines.update({
      where: { id: pipelineIdNum },
      data: {
        status: status,
        updatedAt: new Date()
      },
      include: {
        users: { select: { name: true, email: true } },
        companies: { select: { name: true } }
      }
    });

    console.log("Pipeline updated successfully:", updatedPipeline.id);

    return NextResponse.json({
      success: true,
      pipeline: updatedPipeline,
      immediateSaleCreated,
      message: immediateSaleCreated
        ? "Pipeline status updated and moved to immediate sales"
        : "Pipeline status updated successfully"
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error updating pipeline status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update pipeline status", details: errorMessage },
      { status: 500 }
    );
  }
}

function resolvePeriodStart(period: string | null): Date | null {
  const now = new Date();

  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'month':
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}
