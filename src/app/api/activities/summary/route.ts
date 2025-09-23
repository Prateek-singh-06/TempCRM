import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
        select: { id: true, name: true, email: true, role: true, department: true }
      });
      return user;
    }
    return null;
  } catch (e) {
    console.error("Error verifying token:", e);
    return null;
  }
}

// GET /api/activities/summary?days=30
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? Math.max(1, parseInt(daysParam)) : 30;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = { occurredAt: { gte: since } };
    // Admin: whole org; Others: only self
    if (user.role !== 'admin') {
      where.userId = user.id;
    }

    const rows = await prisma.activities.findMany({
      where,
      select: { userId: true, type: true },
      orderBy: { occurredAt: 'desc' }
    });

    // Fetch names for users present in rows
    const userIds = Array.from(new Set(rows.map(r => r.userId)));
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const nameById = new Map(users.map(u => [u.id, u.name]));

    const summaryMap = new Map<number, { userId: number; name: string; calls: number; emails: number; meetings: number; demos: number; proposals: number; followUps: number; visits: number }>();
    for (const row of rows) {
      if (!summaryMap.has(row.userId)) {
        summaryMap.set(row.userId, {
          userId: row.userId,
          name: nameById.get(row.userId) || `User ${row.userId}`,
          calls: 0,
          emails: 0,
          meetings: 0,
          demos: 0,
          proposals: 0,
          followUps: 0,
          visits: 0
        });
      }
      const s = summaryMap.get(row.userId)!;
      switch (row.type) {
        case 'CALL': s.calls++; break;
        case 'EMAIL': s.emails++; break;
        case 'MEETING': s.meetings++; break;
        case 'DEMO': s.demos++; break;
        case 'PROPOSAL': s.proposals++; break;
        case 'FOLLOW_UP': s.followUps++; break;
        case 'VISIT': s.visits++; break;
        default: break;
      }
    }

    const summary = Array.from(summaryMap.values()).sort((a, b) => (
      (b.calls + b.emails + b.meetings + b.demos) - (a.calls + a.emails + a.meetings + a.demos)
    ));

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Activities summary error:', error);
    return NextResponse.json({ error: 'Failed to get activities summary' }, { status: 500 });
  }
}

