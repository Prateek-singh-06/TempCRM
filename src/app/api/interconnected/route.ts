import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { DataInterconnectionService } from "@/lib/dataInterconnection";

async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;
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
  } catch (e) {
    console.error('Interconnected: token verify failed', e);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = new DataInterconnectionService();
    const data = await svc.getInterconnectedData(String(user.id));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Interconnected route error:', error);
    return NextResponse.json({ error: 'Failed to get interconnected data' }, { status: 500 });
  }
}

