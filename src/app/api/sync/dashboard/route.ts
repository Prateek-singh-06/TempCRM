// API endpoint for Dashboard synchronization
// Handles data updates from other systems

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

// POST /api/sync/dashboard - Receive sync data from other systems
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dataType, payload, timestamp, sourceSystem } = await request.json();

    // Log the sync event
    console.log(`Dashboard sync received from ${sourceSystem}:`, {
      dataType,
      timestamp,
      userId: user.id
    });

    // Handle different data types
    switch (dataType) {
      case 'attendance_update':
        // Handle attendance updates from other systems
        await handleAttendanceSync(payload, user.id.toString());
        break;

      case 'lead_created':
        // Handle new lead notifications
        await handleLeadSync(payload, user.id.toString());
        break;

      case 'task_overdue':
        // Handle overdue task alerts
        await handleTaskSync(payload, user.id.toString());
        break;

      default:
        console.log(`Unknown data type: ${dataType}`);
    }

    return NextResponse.json({
      success: true,
      message: `Dashboard synced ${dataType} from ${sourceSystem}`,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    console.error("Dashboard sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Dashboard sync failed", details: errorMessage },
      { status: 500 }
    );
  }
}

async function handleAttendanceSync(payload: any, userId: string) {
  // Update dashboard cache or trigger real-time updates
  console.log('Processing attendance sync:', payload);

  // Could trigger dashboard refresh or send real-time notification
  // This is where you'd implement specific dashboard update logic
}

async function handleLeadSync(payload: any, userId: string) {
  // Update lead counters on dashboard
  console.log('Processing lead sync:', payload);

  // Could update dashboard metrics or send notifications
}

async function handleTaskSync(payload: any, userId: string) {
  // Update overdue task counters
  console.log('Processing task sync:', payload);

  // Could trigger urgent notifications or dashboard alerts
}

// GET /api/sync/dashboard/status - Check sync status
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return dashboard sync status
    return NextResponse.json({
      system: 'dashboard',
      status: 'operational',
      lastSync: new Date(),
      version: '1.0.0'
    });

  } catch (error: unknown) {
    console.error("Dashboard status error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard status" },
      { status: 500 }
    );
  }
}
