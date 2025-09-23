import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/emailService";

async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId) return null;
    const user = await prisma.users.findUnique({ where: { email: payload.userId as string } });
    return user;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin' || user.role === 'SuperAdmin';
    if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const dateStr = (body.date || new Date().toISOString().substring(0,10)) as string;
    const dryRun = !!body.dryRun;

    const day = new Date(dateStr);
    if (isNaN(day.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD' }, { status: 400 });
    }

    const start = new Date(day); start.setHours(0,0,0,0);
    const end = new Date(day); end.setHours(23,59,59,999);

    const users = await prisma.users.findMany({
      where: { role: { not: "admin" } },
      select: { id: true, name: true, email: true, enableNotifications: true }
    });
    const todays = await prisma.attendances.findMany({ where: { date: { gte: start, lte: end } }, select: { userId: true } });
    const submittedIds = new Set(todays.map(a => a.userId));
    const missing = users.filter(u => u.enableNotifications && u.email && !submittedIds.has(u.id));

    if (dryRun) {
      return NextResponse.json({ date: dateStr, missingCount: missing.length, sample: missing.slice(0,5) });
    }

    const verify = await emailService.verifyTransport();
    if (!verify.success) {
      return NextResponse.json({ error: 'SMTP verification failed', details: verify.details }, { status: 500 });
    }

    let sent = 0;
    for (const u of missing) {
      const html = emailService.generateAttendanceReminderEmail(u.name || 'Team Member');
      const ok = await emailService.sendEmail({ to: u.email!, subject: `Attendance Reminder - ${dateStr}`, html });
      if (ok) sent += 1;
    }

    return NextResponse.json({ success: true, date: dateStr, missingCount: missing.length, sent });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send reminders', details: msg }, { status: 500 });
  }
}

