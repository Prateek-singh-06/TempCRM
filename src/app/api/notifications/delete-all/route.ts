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

// DELETE /api/notifications/delete-all - Delete all user notifications
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await prisma.notifications.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    console.error("Error deleting all notifications:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to delete all notifications", details: message }, { status: 500 });
  }
}

