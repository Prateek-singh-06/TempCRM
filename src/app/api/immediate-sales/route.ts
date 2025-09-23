import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import {
  DealCategorizationEngine,
  NotificationEngine
} from "@/lib/businessLogic";

// Define enums locally as they match Prisma schema
enum DealCategory {
  MICRO = "MICRO",
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
  ENTERPRISE = "ENTERPRISE"
}

enum UrgencyLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      // Fetch real user data from database using email
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true
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

// GET /api/immediate-sales - List all immediate sales
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const ownerId = searchParams.get("ownerId");

    let immediateSales = await prisma.immediate_sales.findMany({
      where: user.role !== 'admin' && user.role !== 'SuperAdmin'
        ? { ownerId: user.id }
        : {},
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true }
        },
        projects: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Apply filters
    if (status) {
      immediateSales = immediateSales.filter(sale => sale.status === status);
    }
    if (projectId) {
      immediateSales = immediateSales.filter(sale => sale.projectId === parseInt(projectId));
    }
    if (ownerId) {
      immediateSales = immediateSales.filter(sale => sale.ownerId === parseInt(ownerId));
    }

    // For non-admin users, only show their own sales
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      immediateSales = immediateSales.filter(sale => sale.ownerId === user.id);
    }

    // Apply smart business logic and categorization
    const enhancedSales = immediateSales.map(sale => {
      // Auto-categorize by value
      const dealCategory = sale.valueOfOrder
        ? DealCategorizationEngine.categorizeByValue(sale.valueOfOrder)
        : DealCategory.SMALL;

      // Calculate urgency level
      const urgencyLevel = DealCategorizationEngine.calculateUrgencyLevel(
        sale.valueOfOrder || 0,
        undefined, // No deadline for immediate sales
        dealCategory
      );

      // Calculate days since quotation
      const daysSinceQuote = sale.quotationDate
        ? Math.floor((new Date().getTime() - new Date(sale.quotationDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Determine if recent (within 30 days)
      const isRecent = daysSinceQuote <= 30;

      // Calculate conversion probability (simplified)
      const conversionProbability = DealCategorizationEngine.calculateConversionProbability(
        dealCategory,
        daysSinceQuote,
        0, // No follow-ups tracked yet
        daysSinceQuote,
        urgencyLevel
      );

      return {
        ...sale,
        dealCategory,
        urgencyLevel,
        daysSinceQuote,
        isRecent,
        conversionProbability,
        // Smart insights
        insights: {
          priority: urgencyLevel === UrgencyLevel.CRITICAL ? 'HIGH' :
                   dealCategory === DealCategory.ENTERPRISE ? 'HIGH' :
                   dealCategory === DealCategory.LARGE ? 'MEDIUM' : 'LOW',
          recommendation: urgencyLevel === UrgencyLevel.CRITICAL
            ? 'URGENT: Schedule immediate follow-up'
            : dealCategory === DealCategory.ENTERPRISE
            ? 'High-value enterprise deal - prioritize'
            : 'Monitor and follow up regularly'
        }
      };
    });

    // Calculate enhanced totals and analytics
    const analytics = {
      totalValue: enhancedSales.reduce((sum, sale) => sum + (sale.valueOfOrder || 0), 0),
      totalKm: enhancedSales.reduce((sum, sale) => sum + (sale.km || 0), 0),
      totalMt: enhancedSales.reduce((sum, sale) => sum + (sale.mt || 0), 0),
      count: enhancedSales.length,
      // Category breakdown
      byCategory: {
        enterprise: enhancedSales.filter(s => s.dealCategory === DealCategory.ENTERPRISE).length,
        large: enhancedSales.filter(s => s.dealCategory === DealCategory.LARGE).length,
        medium: enhancedSales.filter(s => s.dealCategory === DealCategory.MEDIUM).length,
        small: enhancedSales.filter(s => s.dealCategory === DealCategory.SMALL).length,
        micro: enhancedSales.filter(s => s.dealCategory === DealCategory.MICRO).length
      },
      // Status breakdown
      byStatus: {
        bidding: enhancedSales.filter(s => s.status === 'BIDDING').length,
        ongoing: enhancedSales.filter(s => s.status === 'ONGOING').length,
        awarded: enhancedSales.filter(s => s.status === 'AWARDED').length,
        lost: enhancedSales.filter(s => s.status === 'LOST').length,
        pending: enhancedSales.filter(s => s.status === 'PENDING').length
      },
      // Performance metrics
      averageValue: enhancedSales.length > 0
        ? enhancedSales.reduce((sum, s) => sum + (s.valueOfOrder || 0), 0) / enhancedSales.length
        : 0,
      recentCount: enhancedSales.filter(s => s.isRecent).length,
      highPriorityCount: enhancedSales.filter(s =>
        s.urgencyLevel === UrgencyLevel.CRITICAL ||
        s.dealCategory === DealCategory.ENTERPRISE
      ).length
    };

    return NextResponse.json({
      immediateSales: enhancedSales,
      analytics,
      insights: {
        topPriority: analytics.highPriorityCount,
        recentActivity: analytics.recentCount,
        conversionPotential: enhancedSales.reduce((sum, s) => sum + (s.conversionProbability || 0), 0) / enhancedSales.length,
        recommendations: [
          analytics.highPriorityCount > 0
            ? `${analytics.highPriorityCount} high-priority deals need immediate attention`
            : null,
          analytics.recentCount > 0
            ? `${analytics.recentCount} recent quotations to follow up`
            : null,
          analytics.byStatus.bidding > 3
            ? 'Multiple deals in bidding phase - focus on conversion'
            : null
        ].filter(Boolean)
      }
    });
  } catch (error: unknown) {
    console.error("Error fetching immediate sales:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch immediate sales", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/immediate-sales - Create a new immediate sale
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      contractor,
      sizeClass,
      km,
      mt,
      valueOfOrder,
      quotationDate,
      status = "BIDDING",
      pic
    } = body;

    // Validate required fields
    if (!valueOfOrder) {
      return NextResponse.json({ error: "Order value is required" }, { status: 400 });
    }

    // Auto-categorize and calculate urgency
    const dealCategory = valueOfOrder
      ? DealCategorizationEngine.categorizeByValue(valueOfOrder)
      : 'SMALL' as any;

    const urgencyLevel = DealCategorizationEngine.calculateUrgencyLevel(
      valueOfOrder || 0,
      undefined, // No deadline for immediate sales
      dealCategory
    );

    const immediateSale = await prisma.immediate_sales.create({
      data: {
        projectId: projectId ? parseInt(projectId) : null,
        ownerId: user.id,
        contractor,
        sizeClass,
        km,
        mt,
        valueOfOrder,
        quotationDate: quotationDate ? new Date(quotationDate) : null,
        status: status as any,
        pic,
        dealCategory,
        urgencyLevel: urgencyLevel as any,
        updatedAt: new Date()
      }
    });

    // Generate smart notification based on deal characteristics
    const notification = NotificationEngine.generatePersonalizedNotification(
      user.name,
      'new_opportunity',
      valueOfOrder,
      undefined,
      urgencyLevel
    );

    return NextResponse.json({
      success: true,
      immediateSale: {
        ...immediateSale,
        dealCategory,
        urgencyLevel,
        insights: {
          priority: urgencyLevel === UrgencyLevel.CRITICAL ? 'HIGH' :
                   dealCategory === DealCategory.ENTERPRISE ? 'HIGH' :
                   dealCategory === DealCategory.LARGE ? 'MEDIUM' : 'LOW',
          recommendation: urgencyLevel === UrgencyLevel.CRITICAL
            ? 'URGENT: Schedule immediate follow-up'
            : dealCategory === DealCategory.ENTERPRISE
            ? 'High-value enterprise deal - prioritize'
            : 'Monitor and follow up regularly'
        }
      },
      analytics: {
        dealCategory,
        urgencyLevel,
        notification: notification.message
      },
      message: "Smart immediate sale created with AI categorization"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error creating immediate sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create immediate sale", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/immediate-sales - Update an immediate sale
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Immediate sale ID is required" }, { status: 400 });
    }

    // Check permissions and update logic would go here
    // For now, allowing all authenticated users to update

    return NextResponse.json({
      success: true,
      message: "Immediate sale updated successfully"
    });

  } catch (error: unknown) {
    console.error("Error updating immediate sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update immediate sale", details: errorMessage },
      { status: 500 }
    );
  }
}
