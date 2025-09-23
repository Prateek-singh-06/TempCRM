import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/emailService";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    // First try to get user info from headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (userId && userRole) {
      // Fetch user from database to ensure they exist
      const user = await prisma.users.findUnique({
        where: { email: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true
        }
      });

      if (!user) {
        console.error("User not found in database:", userId);
        return null;
      }

      return user;
    }

    // Fallback to manual JWT verification if headers not available
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      console.error("No token found in cookies");
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) {
      console.error("No userId in JWT payload");
      return null;
    }

    // Fetch user from database to ensure they exist
    const user = await prisma.users.findUnique({
      where: { email: payload.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true
      }
    });

    if (!user) {
      console.error("User not found in database:", payload.userId);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// POST /api/pending-quotations/link-followup - Create follow-up for quotation
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      quotationId,
      followUpType,
      description,
      nextAction,
      nextActionDate,
      priority = "MEDIUM",
      notes,
      sendReminder = false
    } = body;

    if (!quotationId || !description || !nextAction || !nextActionDate) {
      return NextResponse.json({
        error: "Missing required fields: quotationId, description, nextAction, nextActionDate"
      }, { status: 400 });
    }

    // Verify quotation exists and user has access
    const quotation = await prisma.pending_quotations.findUnique({
      where: { id: parseInt(quotationId) },
      include: {
        users: { select: { name: true, email: true } }
      }
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && quotation.createdById !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create follow-up linked to the quotation
    const followUp = await prisma.daily_follow_ups.create({
      data: {
        assignedTo: user.name || "Unknown User",
        actionType: followUpType || "CALL",
        actionDescription: description,
        status: "SCHEDULED",
        followUpDate: new Date(nextActionDate),
        notes: notes ? `${notes} [Priority: ${priority}]` : `Follow-up for quotation: ${quotation.projectOrClientName} [Priority: ${priority}]`,
        timezone: "Asia/Kolkata",
        projectId: quotation.projectId,
        salesDealId: quotation.salesDealId,
        immediateSaleId: quotation.immediateSaleId,
        createdById: user.id,
        updatedAt: new Date()
      }
    });

    // Send reminder email if requested
    if (sendReminder && quotation.contactEmail) {
      const reminderHtml = emailService.generateSystemNotificationEmail(
        quotation.contactPerson || "Valued Customer",
        `Follow-up Reminder - ${quotation.projectOrClientName}`,
        `This is a reminder regarding your quotation for ${quotation.projectOrClientName}. Our team will be contacting you soon to discuss the details and next steps.`
      );

      await emailService.sendEmail({
        to: quotation.contactEmail,
        subject: `Follow-up Reminder - ${quotation.projectOrClientName}`,
        html: reminderHtml
      });
    }

    return NextResponse.json({
      success: true,
      followUp,
      message: "Follow-up created and linked to quotation successfully"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error creating linked follow-up:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create linked follow-up", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/pending-quotations/link-followup - Get follow-ups for a quotation
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');

    if (!quotationId) {
      return NextResponse.json({ error: "quotationId parameter is required" }, { status: 400 });
    }

    // Verify quotation exists and user has access
    const quotation = await prisma.pending_quotations.findUnique({
      where: { id: parseInt(quotationId) }
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && quotation.createdById !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get linked follow-ups (through project, sales deal, or immediate sale)
    const followUps = await prisma.daily_follow_ups.findMany({
      where: {
        OR: [
          quotation.projectId ? { projectId: quotation.projectId } : {},
          quotation.salesDealId ? { salesDealId: quotation.salesDealId } : {},
          quotation.immediateSaleId ? { immediateSaleId: quotation.immediateSaleId } : {},
        ].filter(condition => Object.keys(condition).length > 0)
      },
      include: {
        users: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      followUps,
      quotation: {
        id: quotation.id,
        projectOrClientName: quotation.projectOrClientName,
        status: quotation.status
      }
    });

  } catch (error: unknown) {
    console.error("Error fetching linked follow-ups:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch linked follow-ups", details: errorMessage },
      { status: 500 }
    );
  }
}
