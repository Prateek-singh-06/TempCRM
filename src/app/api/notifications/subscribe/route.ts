import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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

// POST /api/notifications/subscribe - Subscribe to push notifications
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.push_subscriptions.findFirst({
      where: {
        userId: user.id,
        endpoint: endpoint
      }
    });

    if (existingSubscription) {
      // Update existing subscription
      await prisma.push_subscriptions.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new subscription
      await prisma.push_subscriptions.create({
        data: {
          userId: user.id,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to push notifications"
    });

  } catch (error: unknown) {
    console.error("Error subscribing to notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to subscribe to notifications", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/subscribe - Unsubscribe from push notifications
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await prisma.push_subscriptions.deleteMany({
      where: {
        userId: user.id,
        endpoint: endpoint
      }
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from push notifications"
    });

  } catch (error: unknown) {
    console.error("Error unsubscribing from notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to unsubscribe from notifications", details: errorMessage },
      { status: 500 }
    );
  }
}
