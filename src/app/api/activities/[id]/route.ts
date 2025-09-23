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
        select: { id: true, name: true, email: true }
      });

      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/activities/[id] - Get a specific activity
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activityId = parseInt(id);
    if (isNaN(activityId)) {
      return NextResponse.json(
        { error: "Invalid activity ID" },
        { status: 400 }
      );
    }

    const activity = await prisma.activities.findFirst({
      where: {
        id: activityId,
        userId: user.id // Ensure user can only access their own activities
      },
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            companies: { select: { id: true, name: true } },
            email: true,
            phone: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ activity });

  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

// PUT /api/activities/[id] - Update an activity
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activityId = parseInt(id);
    if (isNaN(activityId)) {
      return NextResponse.json(
        { error: "Invalid activity ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      leadId,
      type,
      subject,
      description,
      occurredAt,
      duration,
      outcome,
      nextAction,
      nextActionDate,
      evidenceUrl
    } = body;

    // Check if activity exists and belongs to user
    const existingActivity = await prisma.activities.findFirst({
      where: {
        id: activityId,
        userId: user.id
      }
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: "Activity not found or access denied" },
        { status: 404 }
      );
    }

    // Validate activity type if provided
    if (type) {
      const validTypes = ['CALL', 'VISIT', 'MEETING', 'EMAIL', 'DEMO', 'PROPOSAL', 'FOLLOW_UP', 'OTHER'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: "Invalid activity type", validTypes },
          { status: 400 }
        );
      }
    }

    // Validate lead exists and belongs to user if provided
    if (leadId) {
      const lead = await prisma.leads.findFirst({
        where: {
          id: parseInt(leadId),
          ownerId: user.id
        }
      });

      if (!lead) {
        return NextResponse.json(
          { error: "Lead not found or access denied" },
          { status: 400 }
        );
      }
    }

    const updatedActivity = await prisma.activities.update({
      where: { id: activityId },
      data: {
        ...(leadId !== undefined && { leadId: leadId ? parseInt(leadId) : null }),
        ...(type && { type: type as any }),
        ...(subject && { subject }),
        ...(description !== undefined && { description }),
        ...(occurredAt && { occurredAt: new Date(occurredAt) }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(outcome !== undefined && { outcome }),
        ...(nextAction !== undefined && { nextAction }),
        ...(nextActionDate !== undefined && {
          nextActionDate: nextActionDate ? new Date(nextActionDate) : null
        }),
        ...(evidenceUrl !== undefined && { evidenceUrl })
      },
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            companies: { select: { id: true, name: true } }
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ activity: updatedActivity });

  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id] - Delete an activity
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activityId = parseInt(id);
    if (isNaN(activityId)) {
      return NextResponse.json(
        { error: "Invalid activity ID" },
        { status: 400 }
      );
    }

    // Check if activity exists and belongs to user
    const activity = await prisma.activities.findFirst({
      where: {
        id: activityId,
        userId: user.id
      }
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.activities.delete({
      where: { id: activityId }
    });

    return NextResponse.json({
      message: "Activity deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
