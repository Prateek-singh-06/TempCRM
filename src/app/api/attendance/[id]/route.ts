import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
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

// GET /api/attendance/[id] - Get a specific attendance record
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const attendanceId = parseInt(resolvedParams.id);
    if (isNaN(attendanceId)) {
      return NextResponse.json({ error: "Invalid attendance ID" }, { status: 400 });
    }

    const attendance = await prisma.attendances.findFirst({
      where: {
        id: attendanceId,
        userId: user.id
      },
      include: {
        users_attendances_userIdTousers: {
          select: { name: true, email: true, employeeCode: true }
        }
      }
    });

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance record" },
      { status: 500 }
    );
  }
}

// PUT /api/attendance/[id] - Update an attendance record
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const attendanceId = parseInt(resolvedParams.id);
    if (isNaN(attendanceId)) {
      return NextResponse.json({ error: "Invalid attendance ID" }, { status: 400 });
    }

    const body = await request.json();
    const { visitReport, timelineUrl, photoUrl, status } = body;

    // Check if attendance exists and belongs to user
    const existingAttendance = await prisma.attendances.findFirst({
      where: {
        id: attendanceId,
        userId: user.id
      }
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const updatedAttendance = await prisma.attendances.update({
      where: { id: attendanceId },
      data: {
        ...(visitReport && { visitReport }),
        ...(timelineUrl !== undefined && { timelineUrl }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(status && { status }),
      },
      include: {
        users_attendances_userIdTousers: {
          select: { name: true, email: true, employeeCode: true }
        }
      }
    });

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 }
    );
  }
}

// DELETE /api/attendance/[id] - Delete an attendance record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const attendanceId = parseInt(resolvedParams.id);
    if (isNaN(attendanceId)) {
      return NextResponse.json({ error: "Invalid attendance ID" }, { status: 400 });
    }

    // Check if attendance exists and belongs to user
    const existingAttendance = await prisma.attendances.findFirst({
      where: {
        id: attendanceId,
        userId: user.id
      }
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    await prisma.attendances.delete({
      where: { id: attendanceId }
    });

    return NextResponse.json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { error: "Failed to delete attendance record" },
      { status: 500 }
    );
  }
}
