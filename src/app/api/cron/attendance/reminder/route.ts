import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/emailService";

function getTodayWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function authorize(request: Request) {
  const key = process.env.CRON_SECRET;
  if (!key) return true; // If no secret set, allow (development convenience)
  const url = new URL(request.url);
  const qsKey = url.searchParams.get('key');
  const headerKey = request.headers.get('x-cron-secret');
  return qsKey === key || headerKey === key;
}

export async function GET(request: Request) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';

    const { start, end } = getTodayWindow();

    // Fetch all users with emails and notifications enabled
    const users = await prisma.users.findMany({
      where: { enableNotifications: true },
      select: { id: true, name: true, email: true }
    });

    // Fetch today's attendance submissions
    const todays = await prisma.attendances.findMany({
      where: {
        date: { gte: start, lte: end }
      },
      select: { userId: true }
    });

    const submittedIds = new Set(todays.map(a => a.userId));

    const missing = users.filter(u => u.email && !submittedIds.has(u.id));

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        date: start.toISOString().substring(0, 10),
        totalUsers: users.length,
        submitted: submittedIds.size,
        missingCount: missing.length,
        sample: missing.slice(0, 5)
      });
    }

    // Verify SMTP before sending to avoid mass failures
    const verify = await emailService.verifyTransport();
    if (!verify.success) {
      return NextResponse.json({ error: 'SMTP verification failed', details: verify.details }, { status: 500 });
    }

    let sent = 0;
    for (const u of missing) {
      const html = emailService.generateAttendanceReminderEmail(u.name || 'Team Member');
      const ok = await emailService.sendEmail({
        to: u.email!,
        subject: 'Reminder: Please submit today\'s attendance',
        html
      });
      if (ok) sent += 1;
    }

    return NextResponse.json({
      success: true,
      date: start.toISOString().substring(0, 10),
      totalUsers: users.length,
      submitted: submittedIds.size,
      missingCount: missing.length,
      sent
    });

  } catch (error: unknown) {
    console.error('Attendance reminder cron error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal error', details: msg }, { status: 500 });
  }
}

