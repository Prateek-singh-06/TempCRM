import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import {
  DeadlineManagementEngine,
  calculateDaysToDeadline,
  calculateDaysPending,
  isOverdue as isOverdueFunction
} from "@/lib/businessLogic";

// Define enums locally as they match Prisma schema
enum UrgencyLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

// Enhanced quotation record with computed properties
interface EnhancedPendingQuotationRecord {
  id: string;
  projectOrClientName: string;
  quotationPendingSince?: string;
  quotationDeadline?: string;
  orderValue?: number;
  contactPerson?: string;
  contactEmail?: string;
  quotationDocument?: string;
  status: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  // Enhanced properties
  daysPending: number;
  isOverdue: boolean;
  daysToDeadline: number | null;
  urgencyLevel: UrgencyLevel;
  statusColor: string;
  compliance: { status: string; recommendation: string };
  nextActions: string[];
  riskLevel: string;
  nextReminderDate: Date | null;
}

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    // First try to get user info from headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (userId && userRole) {
      // Fetch user from database to ensure they exist
      const user = await prisma.users.findUnique({
        where: { email: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true
        }
      });

      if (!user) {
        console.error("User not found in database:", userId);
        return null;
      }

      return {
        id: user.id.toString(),
        name: user.name,
        role: user.role,
        employeeCode: user.employeeCode
      };
    }

    // Fallback to manual JWT verification if headers not available
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      console.error("No token found in cookies");
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) {
      console.error("No userId in JWT payload");
      return null;
    }

    // Fetch user from database to ensure they exist
    const user = await prisma.users.findUnique({
      where: { email: payload.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true
      }
    });

    if (!user) {
      console.error("User not found in database:", payload.userId);
      return null;
    }

    return {
      id: user.id.toString(),
      name: user.name,
      role: user.role,
      employeeCode: user.employeeCode
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/pending-quotations - List all pending quotations with overdue detection
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const showOverdue = searchParams.get("overdue") === "true";
    const createdById = searchParams.get("createdById");

    // Build where clause for Prisma query
    const whereClause: any = {};

    // For non-admin users, only show their own quotations
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      whereClause.createdById = parseInt(user.id);
    }

    // Apply filters
    if (status) {
      whereClause.status = status;
    }
    if (createdById) {
      // Only allow filtering by createdById for admins
      if (user.role === 'admin' || user.role === 'SuperAdmin') {
        whereClause.createdById = parseInt(createdById);
      }
    }

    const quotations = await prisma.pending_quotations.findMany({
      where: whereClause,
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true }
        },
        projects: true,
        immediate_sales: true,
        sales_deals: true,
        opportunities: true,
        companies: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate smart business logic with deadline management
    const now = new Date();
    const enhancedQuotations: EnhancedPendingQuotationRecord[] = quotations.map(quote => {
      const daysPending = calculateDaysPending(
        quote.quotationPendingSince || now
      );

      const deadline = quote.quotationDeadline;
      const isOverdue = deadline ? isOverdueFunction(deadline) : false;
      const daysToDeadline = deadline ? calculateDaysToDeadline(deadline) : null;

      // Calculate urgency level based on deadline proximity and status
      let urgencyLevel: UrgencyLevel = UrgencyLevel.LOW;
      if (quote.urgencyLevel) {
        urgencyLevel = quote.urgencyLevel as UrgencyLevel;
      }
      let statusColor = 'gray';

      if (isOverdue && quote.status === 'PENDING') {
        urgencyLevel = UrgencyLevel.CRITICAL;
        statusColor = 'red';
      } else if (daysToDeadline !== null) {
        if (daysToDeadline <= 1) {
          urgencyLevel = UrgencyLevel.CRITICAL;
          statusColor = 'red';
        } else if (daysToDeadline <= 3) {
          urgencyLevel = UrgencyLevel.HIGH;
          statusColor = 'orange';
        } else if (daysToDeadline <= 7) {
          urgencyLevel = UrgencyLevel.MEDIUM;
          statusColor = 'yellow';
        }
      }

      // Calculate compliance status and recommendations
      const complianceAnalysis = DeadlineManagementEngine.calculateComplianceStatus(
        deadline || now,
        quote.status,
        quote.reminderCount || 0
      );

      // Generate smart next action recommendations
      const nextActions = [];
      if (isOverdue && quote.status === 'PENDING') {
        nextActions.push('URGENT: Send immediate follow-up and escalate to management');
      } else if (urgencyLevel === UrgencyLevel.CRITICAL) {
        nextActions.push('CRITICAL: Schedule urgent client call within 24 hours');
      } else if (urgencyLevel === UrgencyLevel.HIGH) {
        nextActions.push('HIGH: Send reminder email and prepare quotation revision');
      } else if (daysToDeadline !== null && daysToDeadline <= 14) {
        nextActions.push('Prepare final quotation and confirm delivery timeline');
      }

      return {
        id: quote.id.toString(),
        projectOrClientName: quote.projectOrClientName,
        quotationPendingSince: quote.quotationPendingSince?.toISOString(),
        quotationDeadline: quote.quotationDeadline?.toISOString(),
        orderValue: quote.orderValue || undefined,
        contactPerson: quote.contactPerson || undefined,
        contactEmail: quote.contactEmail || undefined,
        quotationDocument: quote.quotationDocument || undefined,
        status: quote.status,
        notes: quote.notes || undefined,
        createdById: quote.createdById.toString(),
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
        daysPending,
        isOverdue,
        daysToDeadline,
        urgencyLevel,
        statusColor,
        compliance: {
          status: complianceAnalysis.status,
          recommendation: complianceAnalysis.recommendation
        },
        nextActions,
        riskLevel: isOverdue ? 'CRITICAL' :
                  urgencyLevel === UrgencyLevel.CRITICAL ? 'HIGH' :
                  urgencyLevel === UrgencyLevel.HIGH ? 'MEDIUM' : 'LOW',
        // Calculate optimal reminder timing
        nextReminderDate: deadline ? DeadlineManagementEngine.calculateNextReminderDate(
          deadline,
          quote.lastReminderSent || undefined,
          quote.reminderCount || 0
        ) : null
      };
    });

    // Filter overdue if requested
    let filteredQuotations: EnhancedPendingQuotationRecord[];
    if (showOverdue) {
      filteredQuotations = enhancedQuotations.filter(quote => quote.isOverdue);
    } else {
      filteredQuotations = enhancedQuotations;
    }

    // Calculate statistics
    const stats = {
      total: filteredQuotations.length,
      pending: filteredQuotations.filter(q => q.status === 'PENDING').length,
      sent: filteredQuotations.filter(q => q.status === 'SENT').length,
      overdue: filteredQuotations.filter(q => q.isOverdue).length,
      totalValue: filteredQuotations.reduce((sum, q) => sum + (q.orderValue || 0), 0),
      urgent: filteredQuotations.filter(q => q.urgencyLevel === UrgencyLevel.HIGH).length
    };

    return NextResponse.json({
      quotations: filteredQuotations,
      stats,
      overdueCount: stats.overdue
    });
  } catch (error: unknown) {
    console.error("Error fetching pending quotations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch pending quotations", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/pending-quotations - Create a new pending quotation
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectOrClientName,
      quotationPendingSince = new Date().toISOString(),
      quotationDeadline,
      orderValue,
      totalQty,
      contactPerson,
      contactEmail,
      quotationDocument,
      status = "PENDING",
      notes,
      opportunityId,
      companyId
    } = body;

    // Validate required fields
    if (!projectOrClientName) {
      return NextResponse.json({ error: "Project or client name is required" }, { status: 400 });
    }

    // Validate deadline is in the future
    if (quotationDeadline && new Date(quotationDeadline) <= new Date()) {
      return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
    }

    const quotation = await prisma.pending_quotations.create({
      data: {
        projectOrClientName,
        quotationPendingSince: quotationPendingSince ? new Date(quotationPendingSince) : new Date(),
        quotationDeadline: quotationDeadline ? new Date(quotationDeadline) : null,
        orderValue,
        totalQty,
        contactPerson,
        contactEmail,
        quotationDocument,
        status,
        notes,
        opportunityId: opportunityId ? parseInt(opportunityId) : null,
        companyId: companyId ? parseInt(companyId) : null,
        createdById: parseInt(user.id),
        updatedAt: new Date()
      },
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true }
        },
        projects: true,
        immediate_sales: true,
        sales_deals: true,
        opportunities: true,
        companies: true
      }
    });

    // Automatically create a follow-up for the new quotation
    try {
      const defaultFollowUpDate = quotationDeadline
        ? new Date(quotationDeadline)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now if no deadline

      await prisma.daily_follow_ups.create({
        data: {
          assignedTo: user.name || "Unknown User",
          actionType: "EMAIL",
          actionDescription: `Initial follow-up for quotation: ${projectOrClientName}`,
          status: "SCHEDULED",
          followUpDate: defaultFollowUpDate,
          notes: `Auto-generated follow-up for quotation ${quotation.id}`,
          timezone: "Asia/Kolkata",
          createdById: parseInt(user.id),
          updatedAt: new Date()
        }
      });
    } catch (followUpError) {
      console.error('Error creating auto follow-up:', followUpError);
      // Don't fail the quotation creation if follow-up creation fails
    }

    return NextResponse.json({
      success: true,
      quotation,
      message: "Pending quotation created successfully"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error creating pending quotation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create pending quotation", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/pending-quotations - Update a pending quotation
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Quotation ID is required" }, { status: 400 });
    }

    // Check if quotation exists and user has permission
    const existingQuotation = await prisma.pending_quotations.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Only allow admins or quotation creators to update
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && existingQuotation.createdById !== parseInt(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Additional validation for status changes
    if (updates.status === 'SENT' && !updates.quotationDocument) {
      return NextResponse.json({
        error: "Document URL is required when marking quotation as sent"
      }, { status: 400 });
    }

    // Prepare update data with proper type conversion
    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.contactPerson !== undefined) updateData.contactPerson = updates.contactPerson;
    if (updates.contactEmail !== undefined) updateData.contactEmail = updates.contactEmail;
    if (updates.quotationDocument !== undefined) updateData.quotationDocument = updates.quotationDocument;
    if (updates.orderValue !== undefined) updateData.orderValue = updates.orderValue;

    // Update the quotation
    const updatedQuotation = await prisma.pending_quotations.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true }
        },
        projects: true,
        immediate_sales: true,
        sales_deals: true,
        opportunities: true,
        companies: true
      }
    });

    // Check if quotation status changed to ACCEPTED, REJECTED, or EXPIRED and unfreeze opportunity
    if (updates.status && ['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(updates.status) && updatedQuotation.opportunityId) {
      try {
        await prisma.opportunities.update({
          where: { id: updatedQuotation.opportunityId },
          data: {
            isFrozen: false,
            frozenReason: null,
            updatedAt: new Date()
          }
        });
        console.log(`Opportunity ${updatedQuotation.opportunityId} unfrozen due to quotation status change to ${updates.status}`);
      } catch (unfreezeError) {
        console.error('Error unfreezing opportunity:', unfreezeError);
        // Don't fail the entire request if unfreezing fails
      }
    }

    return NextResponse.json({
      success: true,
      quotation: updatedQuotation,
      message: "Pending quotation updated successfully"
    });

  } catch (error: unknown) {
    console.error("Error updating pending quotation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update pending quotation", details: errorMessage },
      { status: 500 }
    );
  }
}
