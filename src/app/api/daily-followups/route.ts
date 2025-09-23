import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import {
  EffectivenessScoringEngine,
  NotificationEngine,
  calculateDaysToDeadline
} from "@/lib/businessLogic";

// Define enums locally as they match Prisma schema
enum UrgencyLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

enum QualityScore {
  POOR = "POOR",
  FAIR = "FAIR",
  GOOD = "GOOD",
  VERY_GOOD = "VERY_GOOD",
  EXCELLENT = "EXCELLENT"
}

// Enhanced follow-up record with computed properties
interface EnhancedDailyFollowUpRecord {
  id: string;
  assignedTo: string;
  actionType: string;
  actionDescription: string;
  status: string;
  followUpDate: string;
  followUpPhoto?: string;
  notes?: string;
  effectivenessScore?: number;
  completionQuality?: string;
  optimalTimeSlot?: string;
  timezone?: string;
  responseReceived: boolean;
  responseQuality?: string;
  // Ensure UI fields are available
  nextActionDate?: string;
  nextActionNotes?: string;
          projectId?: string;
        salesDealId?: string;
        immediateSaleId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  // Enhanced properties
  isOverdue: boolean;
  isToday: boolean;
  daysOverdue: number;
  daysUntilFollowUp: number;
  recommendations: string[];
  optimalNotificationTime: string;
  priority: string;
  smartInsights: {
    timingOptimization: string;
    effectiveness: string;
    riskLevel: string;
  };
  urgencyLevel?: string;
  overdueReason?: string;
  overdueAcknowledgedAt?: string;
  overdueAcknowledgedBy?: string;
  // Related user (creator) basic info for display
  users?: {
    name: string | null;
    email: string | null;
    employeeCode: string | null;
  };
  // Linked entity display helpers
  linkedType?: 'LEAD' | 'OPPORTUNITY' | 'PIPELINE' | 'NONE';
  linkedName?: string;
  linkedOpportunityId?: string;
  linkedLeadId?: string;
  linkedPipelineId?: string;
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
          employeeCode: true,
          role: true,
          verified: true,
          createdAt: true
        }
      });

      if (!user) {
        console.error("User not found in database:", userId);
        return null;
      }

      return user;
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
        employeeCode: true,
        role: true,
        verified: true,
        createdAt: true
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

// GET /api/daily-followups - Get daily follow-ups with smart analytics
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const showOverdue = searchParams.get('showOverdue') === 'true';
    const userId = searchParams.get('userId');
    const leadId = searchParams.get('leadId');
    const opportunityId = searchParams.get('opportunityId');
    const companyId = searchParams.get('companyId');
    const period = searchParams.get('period'); // week, month, year
    const requireAcknowledgement = searchParams.get('requireAcknowledgement') === 'true';

    const where: any = {};

    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      where.createdById = user.id;
    } else if (userId) {
      where.createdById = parseInt(userId);
    }
    
    if (leadId) where.leadId = parseInt(leadId);
    if (opportunityId) where.opportunityId = parseInt(opportunityId);
    if (companyId) where.companyId = parseInt(companyId);

    if (period) {
      const now = new Date();
      let startDate;
      if (period === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      } else if (period === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      }
      if (startDate) {
        where.followUpDate = {
          gte: startDate,
        };
      }
    }


    let followUps = await prisma.daily_follow_ups.findMany({
      where,
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true }
        },
        projects: true,
        immediate_sales: true,
        sales_deals: true,
        leads: { select: { id: true, name: true, ownerId: true } },
        opportunities: { select: { id: true, name: true, ownerId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter by user permissions
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      followUps = followUps.filter(followUp => followUp.createdById === user.id);
    }

    // Apply filters
    if (status && status !== "all") {
      followUps = followUps.filter(followUp => followUp.status === status);
    }

    if (assignedTo) {
      followUps = followUps.filter(followUp => followUp.assignedTo === assignedTo);
    }

    // Apply smart business logic and analytics
    const now = new Date();
    const enhancedFollowUps: EnhancedDailyFollowUpRecord[] = followUps.map(followUp => {
      const followUpDate = new Date(followUp.followUpDate);
      const isOverdue = followUp.status === 'SCHEDULED' && followUpDate < now;
      const isToday = followUp.createdAt.toDateString() === now.toDateString();
      const daysUntilFollowUp = Math.ceil((followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = isOverdue
        ? Math.ceil((now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const storedUrgency = followUp.urgencyLevel || undefined;
      const computedPriority = storedUrgency ?? (
        isOverdue ? 'CRITICAL' :
        isToday ? 'HIGH' :
        daysUntilFollowUp <= 1 ? 'MEDIUM' : 'LOW'
      );

      // Calculate effectiveness score if completed
      let effectivenessScore = followUp.effectivenessScore;
      if (followUp.status === 'COMPLETED' && !effectivenessScore) {
        effectivenessScore = EffectivenessScoringEngine.calculateFollowUpEffectiveness(
          followUp.responseReceived,
          (followUp.responseQuality as QualityScore) || QualityScore.GOOD,
          30, // Default completion time in minutes
          followUp.actionType,
          0 // Default deal value for now
        );
      }

      // Generate smart recommendations
      const recommendations = EffectivenessScoringEngine.generateNextActionRecommendations(
        followUp.status,
        daysUntilFollowUp,
        1, // Single follow-up
        0, // Default deal value
        isOverdue ? UrgencyLevel.CRITICAL : UrgencyLevel.MEDIUM
      );

      // Smart notification timing
      const optimalNotificationTime = NotificationEngine.optimizeNotificationTiming(
        { preferredHour: 10 } // Default preferences since not stored in DB yet
      );

      const linkedType = followUp.opportunityId
        ? 'OPPORTUNITY'
        : followUp.leadId
          ? 'LEAD'
          : followUp.salesDealId
            ? 'PIPELINE'
            : 'NONE';
      const linkedName = followUp.opportunityId
        ? (followUp.opportunities?.name || `Opportunity #${followUp.opportunityId}`)
        : followUp.leadId
          ? (followUp.leads?.name || `Lead #${followUp.leadId}`)
          : followUp.salesDealId
            ? (followUp.sales_deals?.name || `Pipeline #${followUp.salesDealId}`)
            : undefined;

      return {
        id: followUp.id.toString(),
        createdById: followUp.createdById.toString(),
        followUpDate: followUp.followUpDate.toISOString(),
        followUpPhoto: followUp.followUpPhoto || undefined,
        assignedTo: followUp.assignedTo,
        actionType: followUp.actionType,
        actionDescription: followUp.actionDescription,
        status: followUp.status,
        notes: followUp.notes || undefined,
        effectivenessScore: followUp.effectivenessScore || undefined,
        completionQuality: followUp.completionQuality || undefined,
        optimalTimeSlot: followUp.optimalTimeSlot || undefined,
        timezone: followUp.timezone || undefined,
        responseQuality: followUp.responseQuality || undefined,
        // Expose nextActionDate for any consumers expecting it; fallback to followUpDate
        nextActionDate: (followUp.nextActionDate || followUp.followUpDate)?.toISOString(),
        nextActionNotes: followUp.nextActionNotes || undefined,
        projectId: followUp.projectId?.toString() || undefined,
        salesDealId: followUp.salesDealId?.toString() || undefined,
        immediateSaleId: followUp.immediateSaleId?.toString() || undefined,
        createdAt: followUp.createdAt.toISOString(),
        updatedAt: followUp.updatedAt.toISOString(),
        responseReceived: followUp.responseReceived,
        isOverdue,
        isToday,
        daysOverdue,
        daysUntilFollowUp,
        recommendations,
        optimalNotificationTime: optimalNotificationTime.toISOString(),
        priority: computedPriority,
        urgencyLevel: storedUrgency,
        overdueReason: followUp.overdueReason || undefined,
        overdueAcknowledgedAt: followUp.overdueAcknowledgedAt ? followUp.overdueAcknowledgedAt.toISOString() : undefined,
        overdueAcknowledgedBy: followUp.overdueAcknowledgedBy ? followUp.overdueAcknowledgedBy.toString() : undefined,
        smartInsights: {
          timingOptimization: `Best time to contact: ${optimalNotificationTime.toLocaleTimeString()}`,
          effectiveness: effectivenessScore ? `${effectivenessScore}% effective` : 'Not rated yet',
          riskLevel: isOverdue ? 'HIGH' : daysUntilFollowUp <= 1 ? 'MEDIUM' : 'LOW'
        },
        users: followUp.users ? {
          name: followUp.users.name,
          email: followUp.users.email,
          employeeCode: followUp.users.employeeCode
        } : undefined,
        linkedType,
        linkedName,
        linkedOpportunityId: followUp.opportunityId ? followUp.opportunityId.toString() : undefined,
        linkedLeadId: followUp.leadId ? followUp.leadId.toString() : undefined,
        linkedPipelineId: followUp.salesDealId ? followUp.salesDealId.toString() : undefined
      };
    });

    // Filter overdue if requested
    let filteredFollowUps: EnhancedDailyFollowUpRecord[];
    if (showOverdue) {
      filteredFollowUps = enhancedFollowUps.filter(followUp => followUp.isOverdue);
    } else {
      filteredFollowUps = enhancedFollowUps;
    }

    if (requireAcknowledgement) {
      filteredFollowUps = filteredFollowUps.filter(
        followUp => followUp.isOverdue && !followUp.overdueAcknowledgedAt
      );
    }

    // Calculate comprehensive analytics
    const analytics = {
      total: filteredFollowUps.length,
      completed: filteredFollowUps.filter(f => f.status === 'COMPLETED').length,
      scheduled: filteredFollowUps.filter(f => f.status === 'SCHEDULED').length,
      overdue: filteredFollowUps.filter(f => f.isOverdue).length,
      today: filteredFollowUps.filter(f => f.isToday).length,
      completionRate: filteredFollowUps.length > 0
        ? (filteredFollowUps.filter(f => f.status === 'COMPLETED').length / filteredFollowUps.length) * 100
        : 0,
      averageEffectiveness: filteredFollowUps
        .filter(f => f.effectivenessScore)
        .reduce((sum, f) => sum + (f.effectivenessScore || 0), 0) /
        filteredFollowUps.filter(f => f.effectivenessScore).length || 0,
      byType: {
        CALL: filteredFollowUps.filter(f => f.actionType === 'CALL').length,
        MEETING: filteredFollowUps.filter(f => f.actionType === 'MEETING').length,
        EMAIL: filteredFollowUps.filter(f => f.actionType === 'EMAIL').length,
        SITE_VISIT: filteredFollowUps.filter(f => f.actionType === 'SITE_VISIT').length,
        OTHER: filteredFollowUps.filter(f => f.actionType === 'OTHER').length
      },
      byStatus: {
        COMPLETED: filteredFollowUps.filter(f => f.status === 'COMPLETED').length,
        SCHEDULED: filteredFollowUps.filter(f => f.status === 'SCHEDULED').length,
        POSTPONED: filteredFollowUps.filter(f => f.status === 'POSTPONED').length,
        CANCELLED: filteredFollowUps.filter(f => f.status === 'CANCELLED').length,
        OVERDUE: filteredFollowUps.filter(f => f.isOverdue).length
      }
    };

    return NextResponse.json({
      dailyFollowUps: filteredFollowUps,
      analytics,
      insights: {
        urgentActions: analytics.overdue + analytics.today,
        completionRate: `${analytics.completionRate.toFixed(1)}%`,
        mostEffectiveType: Object.entries(analytics.byType)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0],
        recommendations: [
          analytics.overdue > 0
            ? `${analytics.overdue} follow-ups are overdue - immediate attention required`
            : null,
          analytics.today > 0
            ? `${analytics.today} follow-ups scheduled for today`
            : null,
          analytics.completionRate < 70
            ? 'Follow-up completion rate needs improvement'
            : null
        ].filter(Boolean)
      }
    });

  } catch (error: unknown) {
    console.error("Error fetching daily follow-ups:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch daily follow-ups", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/daily-followups - Create new follow-up with smart scheduling
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      assignedTo,
      actionType,
      actionDescription,
      followUpDate,
      notes,
      projectId,
      salesDealId,
      immediateSaleId,
      timezone,
      linkType,
      leadId,
      opportunityId,
      nextAction,
      companyId,
      priority,
      urgencyLevel
    } = body;

    // Validate required fields
    if (!assignedTo || !actionType || !actionDescription || !followUpDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate optimal notification timing
    const optimalNotificationTime = NotificationEngine.optimizeNotificationTiming(
      { preferredHour: 10 } // Default preferences since not stored in DB yet
    );

    // Validate link ownership for non-admin
    let linkData: { leadId?: number | null; opportunityId?: number | null } = {};
    if (linkType === 'LEAD' && leadId) {
      const lead = await prisma.leads.findFirst({ where: { id: parseInt(leadId), ...(user.role !== 'admin' && user.role !== 'SuperAdmin' ? { ownerId: user.id } : {}) } });
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 400 });
      }
      linkData.leadId = parseInt(leadId);
    }
    if (linkType === 'OPPORTUNITY' && opportunityId) {
      const opp = await prisma.opportunities.findFirst({ where: { id: parseInt(opportunityId), ...(user.role !== 'admin' && user.role !== 'SuperAdmin' ? { ownerId: user.id } : {}) } });
      if (!opp) {
        return NextResponse.json({ error: 'Opportunity not found or access denied' }, { status: 400 });
      }
      linkData.opportunityId = parseInt(opportunityId);
    }

    const followUp = await prisma.daily_follow_ups.create({
      data: {
        assignedTo,
        actionType: actionType as any,
        actionDescription,
        followUpDate: new Date(followUpDate),
        status: 'SCHEDULED',
        notes,
        projectId: projectId ? parseInt(projectId) : null,
        salesDealId: salesDealId ? parseInt(salesDealId) : null,
        immediateSaleId: immediateSaleId ? parseInt(immediateSaleId) : null,
        createdById: user.id,
        timezone: timezone || 'Asia/Kolkata',
        optimalTimeSlot: optimalNotificationTime.toLocaleTimeString(),
        responseReceived: false,
        updatedAt: new Date(),
        leadId: linkData.leadId ?? null,
        opportunityId: linkData.opportunityId ?? null,
        companyId: companyId ? parseInt(companyId) : null,
        urgencyLevel: (priority || urgencyLevel || 'MEDIUM') as any,
      }
    });

    // Update linked entity next follow-up date, if applicable
    try {
      if (linkData.leadId) {
        await prisma.leads.update({
          where: { id: linkData.leadId },
          data: { nextFollowUpDate: new Date(followUpDate) }
        });
      }
      if (linkData.opportunityId) {
        await prisma.opportunities.update({
          where: { id: linkData.opportunityId },
          data: { nextFollowupDate: new Date(followUpDate) }
        });
      }
    } catch (e) {
      console.warn('Warning: failed to sync nextFollowUpDate on linked entity', e);
    }

    // Generate smart notification (for future use)
    // const notification = NotificationEngine.generatePersonalizedNotification(
    //   user.name,
    //   'follow_up_overdue',
    //   undefined,
    //   new Date(followUpDate),
    //   UrgencyLevel.MEDIUM
    // );

    return NextResponse.json({
      success: true,
      followUp: {
        ...followUp,
        optimalNotificationTime: optimalNotificationTime.toISOString(),
        smartRecommendations: [
          `Optimal contact time: ${optimalNotificationTime.toLocaleTimeString()}`,
          'Send reminder 24 hours before follow-up',
          'Prepare all necessary documents in advance'
        ]
      },
      analytics: {
        notificationTiming: optimalNotificationTime.toISOString(),
        priority: 'MEDIUM',
        estimatedEffectiveness: 75 // Default estimation
      },
      message: "Smart follow-up scheduled with optimal timing"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error creating daily follow-up:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create daily follow-up", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/daily-followups/[id] - Update follow-up with effectiveness scoring
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Follow-up ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      notes,
      responseReceived,
      responseQuality,
      completionQuality,
      nextActionDate,
      nextActionNotes,
      overdueReason
    } = body;

    // Get existing follow-up for effectiveness calculation
    const existingFollowUp = await prisma.daily_follow_ups.findUnique({
      where: { id: parseInt(id) }
    });
    if (!existingFollowUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    const effectiveStatus = (status as string | undefined) ?? existingFollowUp.status;

    // Calculate effectiveness score if completing
    let effectivenessScore = existingFollowUp.effectivenessScore;
    if (effectiveStatus === 'COMPLETED' && !effectivenessScore) {
      effectivenessScore = EffectivenessScoringEngine.calculateFollowUpEffectiveness(
        responseReceived || false,
        responseQuality || QualityScore.GOOD,
        30, // Default completion time
        existingFollowUp.actionType,
        0 // Default deal value
      );
    }

    const updateData: any = {};

    if (typeof status !== 'undefined') {
      updateData.status = status as any;
    }
    if (typeof notes !== 'undefined') {
      updateData.notes = notes;
    }
    if (typeof responseReceived !== 'undefined') {
      updateData.responseReceived = responseReceived;
    }
    if (typeof responseQuality !== 'undefined') {
      updateData.responseQuality = responseQuality as any;
    }
    if (typeof completionQuality !== 'undefined') {
      updateData.completionQuality = completionQuality as any;
    }
    if (typeof effectivenessScore !== 'undefined') {
      updateData.effectivenessScore = effectivenessScore;
    }
    if (typeof nextActionDate !== 'undefined') {
      updateData.nextActionDate = nextActionDate ? new Date(nextActionDate) : null;
    }
    if (typeof nextActionNotes !== 'undefined') {
      updateData.nextActionNotes = nextActionNotes;
    }

    if (typeof overdueReason !== 'undefined') {
      updateData.overdueReason = overdueReason;
      const trimmed = typeof overdueReason === 'string' ? overdueReason.trim() : '';
      if (trimmed) {
        updateData.overdueAcknowledgedAt = new Date();
        updateData.overdueAcknowledgedBy = user.id;
      } else {
        updateData.overdueAcknowledgedAt = null;
        updateData.overdueAcknowledgedBy = null;
      }
    }

    updateData.updatedAt = new Date();

    const updated = await prisma.daily_follow_ups.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Sync next follow-up date to linked Lead/Opportunity if nextActionDate provided
    try {
      if (nextActionDate) {
        if (updated.leadId) {
          await prisma.leads.update({
            where: { id: updated.leadId },
            data: { nextFollowUpDate: new Date(nextActionDate) }
          });
        }
        if (updated.opportunityId) {
          await prisma.opportunities.update({
            where: { id: updated.opportunityId },
            data: { nextFollowupDate: new Date(nextActionDate) }
          });
        }
      }
    } catch (e) {
      console.warn('Warning: failed to sync next follow-up date after update', e);
    }

    // Note: Quotation linking removed - linkedQuotationId field doesn't exist in schema
    // If you need to link follow-ups to quotations, add linkedQuotationId field to Prisma schema

    // Generate smart recommendations for next steps
    const recommendations = EffectivenessScoringEngine.generateNextActionRecommendations(
      effectiveStatus,
      nextActionDate ? calculateDaysToDeadline(new Date(nextActionDate)) : 0,
      1,
      0,
      effectiveStatus === 'COMPLETED' ? UrgencyLevel.LOW : UrgencyLevel.MEDIUM
    );

    return NextResponse.json({
      success: true,
      effectivenessScore,
      recommendations,
      analytics: {
        status: effectiveStatus,
        effectiveness: effectivenessScore ? `${effectivenessScore}% effective` : 'Not rated',
        nextAction: nextActionDate || 'No follow-up needed'
      },
      message: "Follow-up updated with smart effectiveness scoring"
    });

  } catch (error: unknown) {
    console.error("Error updating daily follow-up:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update daily follow-up", details: errorMessage },
      { status: 500 }
    );
  }
}
