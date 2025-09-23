import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);
    if (decoded.userId) {
      return prisma.users.findUnique({ where: { email: decoded.userId as string } });
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// PUT /api/notifications/read-all - Mark all user notifications as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await prisma.notifications.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error: unknown) {
    console.error("Error marking all notifications as read:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to mark all as read", details: message }, { status: 500 });
  }
}

