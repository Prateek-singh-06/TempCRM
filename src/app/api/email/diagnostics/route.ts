import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { emailService } from "@/lib/emailService";
import { prisma } from "@/lib/prisma";

async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) return null;
    const user = await prisma.users.findUnique({ where: { email: payload.userId as string }, select: { id: true, role: true } });
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Restrict to admins only to avoid exposing configuration to all users
  const isAdmin = user.role === 'admin' || user.role === 'SuperAdmin';
  if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const env = {
    EMAIL_HOST: !!process.env.EMAIL_HOST,
    EMAIL_PORT: !!process.env.EMAIL_PORT,
    EMAIL_USER: !!process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS ? 'set' : 'missing'
  };

  const verify = await emailService.verifyTransport();
  const diagnostics = emailService.getDiagnostics();

  return NextResponse.json({
    env,
    transport: verify,
    diagnostics,
  });
}
