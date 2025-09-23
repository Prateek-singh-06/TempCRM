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
    const user = await prisma.users.findUnique({
      where: { email: payload.userId as string },
      select: { id: true, email: true, name: true, role: true }
    });
    return user;
  } catch (error) {
    console.error("Email test: token verify error", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('to');
    const body = await request.json().catch(() => ({}));
    const to = (target || body.to || user.email || '').toString();
    const subject = (body.subject || 'CRM Test Email').toString();
    const message = (body.message || `<h2>Test Email</h2><p>Hello ${user.name || 'User'}, this is a test email from Rashmi Group CRM.</p><p>Time: ${new Date().toLocaleString()}</p>`).toString();

    if (!to) {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
    }

    // Verify transport before attempting to send
    const verify = await emailService.verifyTransport();
    if (!verify.success) {
      return NextResponse.json({ error: 'SMTP transport verification failed', details: verify.details }, { status: 500 });
    }

    const sent = await emailService.sendEmail({ to, subject, html: message });
    return NextResponse.json({ success: sent, to, subject, verified: verify });
  } catch (error: unknown) {
    console.error('Email test error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send test email', details }, { status: 500 });
  }
}

