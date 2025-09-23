// Unified User Preferences API
// Manages user preferences across all CRM systems

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/user/preferences/[userId] - Get user preferences
export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Check if user can access these preferences
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && user.id !== parseInt(userId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get user preferences (stored in user profile or separate table)
    const userRecord = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        preferences: true,
        updatedAt: true
      }
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Default preferences if none exist
    const defaultPreferences = {
      dashboardLayout: 'grid',
      analyticsCharts: ['conversion', 'pipeline', 'attendance'],
      notificationSettings: {
        email: true,
        push: true,
        frequency: 'daily'
      },
      theme: 'light',
      timezone: 'Asia/Kolkata',
      language: 'en'
    };

    // Merge stored preferences with defaults
    const preferences = {
      ...defaultPreferences,
      ...(userRecord.preferences as object || {})
    };

    return NextResponse.json({
      userId: userRecord.id,
      preferences,
      lastUpdated: userRecord.updatedAt || new Date()
    });

  } catch (error: unknown) {
    console.error("Get preferences error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get user preferences", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences/[userId] - Update user preferences
export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const updates = await request.json();

    // Check if user can update these preferences
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && user.id !== parseInt(userId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate preference updates
    const validFields = [
      'dashboardLayout', 'analyticsCharts', 'notificationSettings',
      'theme', 'timezone', 'language'
    ];

    const validatedUpdates: any = {};
    for (const field of validFields) {
      if (updates[field] !== undefined) {
        validatedUpdates[field] = updates[field];
      }
    }

    // Update user preferences
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(userId) },
      data: {
        preferences: validatedUpdates,
        updatedAt: new Date()
      },
      select: {
        id: true,
        preferences: true,
        updatedAt: true
      }
    });

    // Log preference change for audit
    console.log(`User preferences updated:`, {
      userId,
      updatedFields: Object.keys(validatedUpdates),
      updatedBy: user.id
    });

    return NextResponse.json({
      success: true,
      preferences: updatedUser.preferences,
      lastUpdated: updatedUser.updatedAt,
      message: "User preferences updated successfully"
    });

  } catch (error: unknown) {
    console.error("Update preferences error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update user preferences", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/user/preferences/[userId] - Reset user preferences to defaults
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Check if user can reset these preferences
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && user.id !== parseInt(userId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Reset to default preferences
    const defaultPreferences = {
      dashboardLayout: 'grid',
      analyticsCharts: ['conversion', 'pipeline', 'attendance'],
      notificationSettings: {
        email: true,
        push: true,
        frequency: 'daily'
      },
      theme: 'light',
      timezone: 'Asia/Kolkata',
      language: 'en'
    };

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(userId) },
      data: {
        preferences: defaultPreferences,
        updatedAt: new Date()
      },
      select: {
        id: true,
        preferences: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      preferences: updatedUser.preferences,
      lastUpdated: updatedUser.updatedAt,
      message: "User preferences reset to defaults"
    });

  } catch (error: unknown) {
    console.error("Reset preferences error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to reset user preferences", details: errorMessage },
      { status: 500 }
    );
  }
}
