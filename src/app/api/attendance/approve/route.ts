import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/emailService";

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

// POST /api/attendance/approve - Approve or reject attendance records
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (only admins can approve/reject)
    const isAdmin = user.role === "admin" || user.role === "SuperAdmin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { attendanceIds, action, notes } = body;

    if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return NextResponse.json({ error: "Attendance IDs are required" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const approvedAt = action === "approve" ? new Date() : null;

    // Update attendance records
    const updatePromises = attendanceIds.map(attendanceId =>
      prisma.attendances.updateMany({
        where: {
          id: parseInt(attendanceId),
          status: { not: status }, // Don't update if already in the target status
        },
        data: {
          status,
          reviewerId: user.id,
          reviewedAt: new Date(),
          reviewNotes: notes || null,
          approvedAt,
        },
      })
    );

    const results = await Promise.all(updatePromises);

    const updatedCount = results.reduce((sum, result) => sum + result.count, 0);

    // Send email notifications to users
    if (updatedCount > 0) {
      try {
        // Get the updated records with user information
        const updatedRecords = await prisma.attendances.findMany({
          where: {
            id: { in: attendanceIds },
            status: action === 'approve' ? 'APPROVED' : 'REJECTED'
          },
          include: {
            users_attendances_userIdTousers: { select: { name: true, email: true } }
          }
        });

        // Send emails to each affected user
        for (const record of updatedRecords) {
          if (record.users_attendances_userIdTousers?.email) {
            const emailHtml = action === 'approve'
              ? emailService.generateAttendanceApprovedEmail(
                  record.users_attendances_userIdTousers.name,
                  record.date,
                  user.name || 'Administrator'
                )
              : emailService.generateAttendanceRejectedEmail(
                  record.users_attendances_userIdTousers.name,
                  record.date,
                  user.name || 'Administrator',
                  notes
                );

            await emailService.sendEmail({
              to: record.users_attendances_userIdTousers.email,
              subject: `Attendance ${action === 'approve' ? 'Approved' : 'Rejected'} - ${record.date.toDateString()}`,
              html: emailHtml
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send attendance notification emails:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d ${updatedCount} attendance record(s)`,
      updatedCount,
      action,
      reviewerId: user.id,
    });

  } catch (error: unknown) {
    console.error("Error processing attendance approval:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to process attendance approval", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/attendance/approve - Get attendance records pending approval
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.role === "admin" || user.role === "SuperAdmin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Build where clause - if no status specified, show all records
    const where: any = {};
    if (statusParam) {
      where.status = statusParam as "SUBMITTED" | "APPROVED" | "REJECTED" | "AUTO_FLAGGED" | "AMENDED";
    }

    const attendances = await prisma.attendances.findMany({
      where,
      include: {
        users_attendances_userIdTousers: {
          select: { name: true, email: true, employeeCode: true, role: true }
        },
        users_attendances_reviewerIdTousers: {
          select: { name: true, email: true }
        }
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });

    // Get summary counts
    const summary = await prisma.attendances.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Create a complete summary object with all status types
    const completeSummary = {
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
      AUTO_FLAGGED: 0,
      AMENDED: 0,
    };

    // Populate with actual counts
    summary.forEach(item => {
      completeSummary[item.status as keyof typeof completeSummary] = item._count.id;
    });

    return NextResponse.json({
      attendances,
      summary: completeSummary,
    });

  } catch (error: unknown) {
    console.error("Error fetching attendance approvals:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch attendance approvals", details: errorMessage },
      { status: 500 }
    );
  }
}
