import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

type RecentActivityItem = {
  id: string;
  type: 'lead_update' | 'lead_created' | 'opportunity_created' | 'opportunity_update' | 'attendance_submitted' | 'activity' | 'other';
  title: string;
  description?: string;
  timestamp: string; // ISO string
  icon?: string;
  color?: string; // hex or tailwind key used by client as hint
  url?: string;
};

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) return null;

    const user = await prisma.users.findUnique({
      where: { email: payload.userId as string },
      select: { id: true, name: true, email: true, role: true }
    });
    return user;
  } catch (error) {
    console.error("recent-activity: token verify error", error);
    return null;
  }
}

// GET /api/recent-activity - Aggregate recent events for dashboard
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = user.role === 'admin' || user.role === 'SuperAdmin';

    // Fetch recent activity logs
    const activities = await prisma.activities.findMany({
      where: isAdmin ? {} : { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: { id: true, type: true, subject: true, occurredAt: true }
    });

    const activityItems: RecentActivityItem[] = activities.map(a => ({
      id: `act_${a.id}`,
      type: 'activity',
      title: a.subject || 'Activity logged',
      timestamp: a.occurredAt.toISOString(),
      icon: 'activity',
      color: '#6366F1'
    }));

    // Recent lead updates (by updatedAt) and creations (by createdDate)
    const leads = await prisma.leads.findMany({
      where: isAdmin ? {} : { ownerId: user.id },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: { id: true, name: true, status: true, createdDate: true, updatedAt: true }
    });

    const leadItems: RecentActivityItem[] = leads.flatMap(l => {
      const items: RecentActivityItem[] = [];
      // Creation event
      items.push({
        id: `lead_created_${l.id}`,
        type: 'lead_created',
        title: `New lead created: ${l.name}`,
        timestamp: l.createdDate.toISOString(),
        icon: 'users',
        color: '#22C55E',
        url: '/leads'
      });
      // Update event (status/other updates)
      items.push({
        id: `lead_update_${l.id}_${l.updatedAt.getTime()}`,
        type: 'lead_update',
        title: `Lead status updated: ${l.name}`,
        description: l.status ? `Status: ${l.status}` : undefined,
        timestamp: l.updatedAt.toISOString(),
        icon: 'refresh-cw',
        color: '#10B981',
        url: '/leads'
      });
      return items;
    });

    // Recent opportunity creations/updates
    const opportunities = await prisma.opportunities.findMany({
      where: isAdmin ? {} : { ownerId: user.id },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: { id: true, name: true, createdDate: true, updatedAt: true, stage: true, dealSize: true }
    });

    const opportunityItems: RecentActivityItem[] = opportunities.flatMap(o => {
      const items: RecentActivityItem[] = [];
      items.push({
        id: `opp_created_${o.id}`,
        type: 'opportunity_created',
        title: `New opportunity created: ${o.name}`,
        timestamp: o.createdDate.toISOString(),
        icon: 'target',
        color: '#3B82F6',
        url: '/opportunities',
        description: `Value: $${Math.round(o.dealSize || 0).toLocaleString()}`
      });
      items.push({
        id: `opp_update_${o.id}_${o.updatedAt.getTime()}`,
        type: 'opportunity_update',
        title: `Opportunity updated: ${o.name}`,
        timestamp: o.updatedAt.toISOString(),
        icon: 'trending-up',
        color: '#2563EB',
        url: '/opportunities',
        description: `${o.stage ? `Stage: ${o.stage}` : ''}${o.stage && (o.dealSize || 0) ? ' • ' : ''}${o.dealSize ? `Value: $${Math.round(o.dealSize).toLocaleString()}` : ''}`.trim()
      });
      return items;
    });

    // Recent attendance submissions
    const attendances = await prisma.attendances.findMany({
      where: isAdmin ? {} : { userId: user.id },
      orderBy: [{ date: 'desc' }],
      take: 10,
      select: { id: true, date: true, userId: true, users_attendances_userIdTousers: { select: { name: true } } }
    });

    const attendanceItems: RecentActivityItem[] = attendances.map(a => ({
      id: `att_${a.id}`,
      type: 'attendance_submitted',
      title: `Attendance submitted${isAdmin ? ` - ${a.users_attendances_userIdTousers?.name || 'User ' + a.userId}` : ''}`,
      timestamp: a.date.toISOString(),
      icon: 'calendar',
      color: '#8B5CF6',
      url: '/attendance'
    }));

    // Combine, sort by time desc, and limit
    const combined = [
      ...activityItems,
      ...leadItems,
      ...opportunityItems,
      ...attendanceItems,
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 15);

    // If nothing found, return a helpful default so UI isn’t blank
    if (combined.length === 0) {
      const nowIso = new Date().toISOString();
      return NextResponse.json({
        activities: [
          { id: 'welcome', type: 'other', title: 'Welcome to your dashboard', timestamp: nowIso, icon: 'activity', color: '#64748B' }
        ] as RecentActivityItem[]
      });
    }

    return NextResponse.json({ activities: combined });
  } catch (error: unknown) {
    console.error('recent-activity: error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch recent activity', details: message }, { status: 500 });
  }
}
