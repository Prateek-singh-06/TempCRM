import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Helper function to get user company IDs for access control
async function getUserCompanyIds(user: any): Promise<number[]> {
  if (user.role === 'admin') {
    const companies = await prisma.companies.findMany({ select: { id: true } });
    return companies.map(c => c.id);
  } else {
    const companies = await prisma.companies.findMany({
      where: { ownerId: user.id },
      select: { id: true }
    });
    return companies.map(c => c.id);
  }
}

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
        select: { id: true, name: true, email: true, role: true }
      });

      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/activities - Get user activities
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query params for richer timeline
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const limitParam = searchParams.get('limit');

    const days = daysParam ? Math.max(1, parseInt(daysParam)) : undefined;
    const limit = limitParam ? Math.max(1, parseInt(limitParam)) : undefined;

    const where: any = {};
    // Scope: by default only current user; admins can optionally fetch team-wide
    const scope = searchParams.get('scope');
    if (!(user.role === 'admin' && scope === 'team')) {
      where.userId = user.id;
    }
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.occurredAt = { gte: since };
    }

    // Fetch activities with enhanced relationships
    const activities = await prisma.activities.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit || (days ? undefined : 10),
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            companies: { select: { id: true, name: true } }
          }
        },
        contacts: {
          select: { id: true, name: true, role: true }
        },
        opportunities: {
          select: { id: true, name: true, stage: true, dealSize: true }
        },
        companies: {
          select: { id: true, name: true, type: true }
        }
      }
    });

    // Transform activities to match the frontend format
    const transformedActivities = activities.map(activity => {
      let description = '';
      let icon = 'activity';

      // Determine primary entity for description
      let entityName = '';
      if (activity.contacts) {
        entityName = `${activity.contacts.name} (${activity.contacts.role})`;
      } else if (activity.leads) {
        entityName = activity.leads.name;
      } else if (activity.opportunities) {
        entityName = activity.opportunities.name;
      } else if (activity.companies) {
        entityName = activity.companies.name;
      }

      switch (activity.type) {
        case 'CALL':
          description = entityName ? `Called ${entityName}` : 'Made a call';
          icon = 'phone';
          break;
        case 'VISIT':
          description = entityName ? `Visited ${entityName}` : 'Made a site visit';
          icon = 'map-pin';
          break;
        case 'MEETING':
          description = entityName ? `Met with ${entityName}` : 'Had a meeting';
          icon = 'users';
          break;
        case 'EMAIL':
          description = entityName ? `Emailed ${entityName}` : 'Sent an email';
          icon = 'mail';
          break;
        case 'DEMO':
          description = entityName ? `Conducted demo for ${entityName}` : 'Conducted a demo';
          icon = 'presentation';
          break;
        case 'PROPOSAL':
          description = entityName ? `Sent proposal to ${entityName}` : 'Sent a proposal';
          icon = 'file-text';
          break;
        case 'FOLLOW_UP':
          description = entityName ? `Followed up with ${entityName}` : 'Made a follow-up';
          icon = 'refresh-cw';
          break;
        default:
          description = activity.subject || 'Activity logged';
          icon = 'activity';
      }

      if (activity.subject && activity.subject !== description) {
        description = activity.subject;
      }

      return {
        id: activity.id,
        type: activity.type.toLowerCase(),
        description,
        timestamp: activity.occurredAt.toISOString(),
        icon,
        // Enhanced activity metadata
        effectiveness: activity.effectiveness,
        sentiment: activity.sentiment,
        channel: activity.channel,
        responseReceived: activity.responseReceived,
        outcome: activity.outcome,
        duration: activity.duration,
        // Related entity information
        relatedEntities: {
          lead: activity.leads ? {
            id: activity.leads.id,
            name: activity.leads.name,
            company: activity.leads.companies?.name || null
          } : null,
          contact: activity.contacts ? {
            id: activity.contacts.id,
            name: activity.contacts.name,
            role: activity.contacts.role
          } : null,
          opportunity: activity.opportunities ? {
            id: activity.opportunities.id,
            name: activity.opportunities.name,
            stage: activity.opportunities.stage,
            dealSize: activity.opportunities.dealSize
          } : null,
          company: activity.companies ? {
            id: activity.companies.id,
            name: activity.companies.name,
            type: activity.companies.type
          } : null
        }
      };
    });

    // If no activities found, return some default ones based on user stats
    if (transformedActivities.length === 0) {
      const userStats = await prisma.users.findUnique({
        where: { id: user.id },
        select: {
          _count: {
            select: {
              leads: true,
              opportunities: true,
              attendances_attendances_userIdTousers: true
            }
          }
        }
      });

      const defaultActivities = [];

      if (userStats && userStats._count.attendances_attendances_userIdTousers > 0) {
        defaultActivities.push({
          id: 'attendance-1',
          type: 'attendance',
          description: `Submitted ${userStats._count.attendances_attendances_userIdTousers} attendance${userStats._count.attendances_attendances_userIdTousers > 1 ? 's' : ''}`,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          icon: 'calendar'
        });
      }

      if (userStats && userStats._count.leads > 0) {
        defaultActivities.push({
          id: 'leads-1',
          type: 'lead',
          description: `Created ${userStats._count.leads} lead${userStats._count.leads > 1 ? 's' : ''}`,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          icon: 'users'
        });
      }

      if (userStats && userStats._count.opportunities > 0) {
        defaultActivities.push({
          id: 'opportunities-1',
          type: 'opportunity',
          description: `Working on ${userStats._count.opportunities} opportunit${userStats._count.opportunities > 1 ? 'ies' : 'y'}`,
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          icon: 'trending-up'
        });
      }

      // If still no activities, show a welcome message
      if (defaultActivities.length === 0) {
        defaultActivities.push({
          id: 'welcome-1',
          type: 'activity',
          description: 'Welcome to CRM! Start by creating your first lead.',
          timestamp: new Date().toISOString(),
          icon: 'activity'
        });
      }

      return NextResponse.json({ activities: defaultActivities });
    }

    return NextResponse.json({ activities: transformedActivities });

  } catch (error: unknown) {
    console.error("Error fetching activities:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch activities", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      leadId,
      type,
      subject,
      description,
      occurredAt,
      duration,
      outcome,
      nextAction,
      nextActionDate,
      evidenceUrl,
      // Enhanced cross-entity relationships
      contactId,
      opportunityId,
      companyId,
      // Enhanced activity intelligence
      activityScore,
      effectiveness,
      channel,
      sentiment,
      followUpRequired,
      followUpScheduled,
      responseReceived,
      responseTime,
      engagementQuality
    } = body;

    // Validation
    if (!type || !subject) {
      return NextResponse.json(
        { error: "Activity type and subject are required" },
        { status: 400 }
      );
    }

    // Validate activity type
    const validTypes = ['CALL', 'VISIT', 'MEETING', 'EMAIL', 'DEMO', 'PROPOSAL', 'FOLLOW_UP', 'OTHER'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid activity type", validTypes },
        { status: 400 }
      );
    }

    // Validate lead exists and belongs to user if provided
    if (leadId) {
      const lead = await prisma.leads.findFirst({
        where: {
          id: parseInt(leadId),
          ownerId: user.role === "admin" ? undefined : user.id
        }
      });

      if (!lead) {
        return NextResponse.json(
          { error: "Lead not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate contact exists if provided
    if (contactId) {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(contactId),
          // Ensure contact belongs to a company the user can access
          companyId: { in: await getUserCompanyIds(user) }
        }
      });

      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate opportunity exists and belongs to user if provided
    if (opportunityId) {
      const opportunity = await prisma.opportunities.findFirst({
        where: {
          id: parseInt(opportunityId),
          ownerId: user.role === "admin" ? undefined : user.id
        }
      });

      if (!opportunity) {
        return NextResponse.json(
          { error: "Opportunity not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate company exists if provided
    if (companyId) {
      const company = await prisma.companies.findFirst({
        where: {
          id: parseInt(companyId),
          ownerId: user.role === "admin" ? undefined : user.id
        }
      });

      if (!company) {
        return NextResponse.json(
          { error: "Company not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate enum fields
    const validEffectivenessLevels = ['LOW', 'MEDIUM', 'HIGH', 'EXCELLENT'];
    if (effectiveness && !validEffectivenessLevels.includes(effectiveness)) {
      return NextResponse.json(
        { error: "Invalid effectiveness level", validLevels: validEffectivenessLevels },
        { status: 400 }
      );
    }

    const validChannels = ['EMAIL', 'PHONE', 'MEETING', 'SOCIAL_MEDIA', 'IN_PERSON', 'CHAT', 'WEBSITE', 'OTHER'];
    if (channel && !validChannels.includes(channel)) {
      return NextResponse.json(
        { error: "Invalid communication channel", validChannels },
        { status: 400 }
      );
    }

    const validSentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
    if (sentiment && !validSentiments.includes(sentiment)) {
      return NextResponse.json(
        { error: "Invalid sentiment", validSentiments },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (activityScore !== undefined && (typeof activityScore !== 'number' || activityScore < 0 || activityScore > 100)) {
      return NextResponse.json(
        { error: "Activity score must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    if (responseTime !== undefined && (typeof responseTime !== 'number' || responseTime < 0)) {
      return NextResponse.json(
        { error: "Response time must be a positive number" },
        { status: 400 }
      );
    }

    const activity = await prisma.activities.create({
      data: {
        // Core fields
        userId: user.id,
        type: type as any,
        subject,
        description,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        duration: duration ? parseInt(duration) : null,
        outcome,
        nextAction,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
        evidenceUrl,
        updatedAt: new Date(),

        // Enhanced cross-entity relationships
        leadId: leadId ? parseInt(leadId) : null,
        contactId: contactId ? parseInt(contactId) : null,
        opportunityId: opportunityId ? parseInt(opportunityId) : null,
        companyId: companyId ? parseInt(companyId) : null,

        // Enhanced activity intelligence
        activityScore: activityScore || 0.0,
        effectiveness: effectiveness ? (effectiveness as any) : null,
        channel: channel ? (channel as any) : null,
        sentiment: sentiment ? (sentiment as any) : null,
        followUpRequired: followUpRequired || false,
        followUpScheduled: followUpScheduled || false,
        responseReceived: responseReceived || false,
        responseTime: responseTime || null,
        engagementQuality: engagementQuality ? (engagementQuality as any) : null
      },
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            companies: { select: { id: true, name: true } }
          }
        },
        contacts: {
          select: { id: true, name: true, role: true }
        },
        opportunities: {
          select: { id: true, name: true, stage: true, dealSize: true }
        },
        companies: {
          select: { id: true, name: true, type: true }
        },
        users: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({ activity }, { status: 201 });

  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
