import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/notifications/[id] - Get single notification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
      },
      include: {
        users_notifications_senderIdTousers: {
          select: { name: true, email: true }
        }
      }
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error: unknown) {
    console.error("Error fetching notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch notification", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/[id] - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const body = await request.json();
    const { isRead } = body;

    // Update notification
    const updatedNotification = await prisma.notifications.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: {
        isRead: isRead !== undefined ? isRead : true,
        updatedAt: new Date()
      }
    });

    if (updatedNotification.count === 0) {
      return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: isRead ? "Notification marked as read" : "Notification marked as unread"
    });
  } catch (error: unknown) {
    console.error("Error updating notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update notification", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    // Delete notification (only if it belongs to the user)
    const deletedNotification = await prisma.notifications.deleteMany({
      where: {
        id: notificationId,
        userId: user.id,
      }
    });

    if (deletedNotification.count === 0) {
      return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error: unknown) {
    console.error("Error deleting notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to delete notification", details: errorMessage },
      { status: 500 }
    );
  }
}
