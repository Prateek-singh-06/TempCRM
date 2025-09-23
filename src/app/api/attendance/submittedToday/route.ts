import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers
      .get("cookie")
      ?.split("token=")[1]
      ?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const now = new Date();

    // Start of today (UTC)
    const startOfDayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );

    // Start of tomorrow (UTC)
    const endOfDayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );

    const submittedToday = await prisma.attendances.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDayUTC,
          lt: endOfDayUTC,
        },
      },
      include: {
        users_attendances_userIdTousers: {
          select: { id: true, name: true, email: true, employeeCode: true, role: true },
        },
      },
    });
    return NextResponse.json({ submittedToday }, { status: 200 });

    // submittedToday will be the attendance record or null
  } catch (error) {
    console.error("Error in GET /api/attendance/submittedToday:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
