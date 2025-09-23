import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { QuotationStatus } from "@prisma/client";

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

      return {
        id: user.id.toString(),
        name: user.name,
        role: user.role,
        employeeCode: user.employeeCode
      };
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

    return {
      id: user.id.toString(),
      name: user.name,
      role: user.role,
      employeeCode: user.employeeCode
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// PUT /api/pending-quotations/[id]/stage - Update quotation stage
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stage, newQuotationDocument, notes } = body;

    if (!stage) {
      return NextResponse.json({ error: "Stage is required" }, { status: 400 });
    }

    const normalizedStage = stage.toUpperCase();

    const resolvedParams = await params;
    const quotationId = parseInt(resolvedParams.id);

    // Check if quotation exists and user has permission
    const existingQuotation = await prisma.pending_quotations.findUnique({
      where: { id: quotationId },
      include: {
        opportunities: true,
        companies: true
      }
    });

    if (!existingQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Only allow admins or quotation creators to update
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && existingQuotation.createdById !== parseInt(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let updateData: any = {
      status: normalizedStage,
      updatedAt: new Date()
    };

    // Handle special cases for different stages
    if (normalizedStage === 'REQUOTATION' && newQuotationDocument) {
      updateData.quotationDocument = newQuotationDocument;
      updateData.notes = `${existingQuotation.notes || ''}\n\n[REQUOTATION - ${new Date().toISOString()}]: ${notes || 'Updated quotation document'}`.trim();
    } else if (notes) {
      updateData.notes = `${existingQuotation.notes || ''}\n\n[${normalizedStage} - ${new Date().toISOString()}]: ${notes}`.trim();
    }

    const freezeStages = new Set([QuotationStatus.PENDING, QuotationStatus.REQUOTATION]);

    // Update the quotation with the latest stage
    const updatedQuotation = await prisma.pending_quotations.update({
      where: { id: quotationId },
      data: updateData,
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true }
        },
        projects: true,
        immediate_sales: true,
        sales_deals: true,
        opportunities: true,
        companies: true
      }
    });

    // Recalculate opportunity freeze status after updating the quotation
    let opportunityStillFrozen: boolean | null = null;

    if (existingQuotation.opportunityId) {
      const activeFreezeCount = await prisma.pending_quotations.count({
        where: {
          opportunityId: existingQuotation.opportunityId,
          status: { in: Array.from(freezeStages) }
        }
      });

      const shouldFreeze = activeFreezeCount > 0;
      opportunityStillFrozen = shouldFreeze;

      await prisma.opportunities.update({
        where: { id: existingQuotation.opportunityId },
        data: {
          isFrozen: shouldFreeze,
          frozenReason: shouldFreeze ? 'Pending quotation in progress' : null,
          updatedAt: new Date()
        }
      });
    }

    // Create a follow-up activity for stage change
    try {
      const followUpDate = normalizedStage === 'DONE' 
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days for post-completion follow-up
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for other stages

      await prisma.daily_follow_ups.create({
        data: {
          assignedTo: user.name || "Unknown User",
          actionType: normalizedStage === 'DONE' ? "CALL" : "EMAIL",
          actionDescription: `Follow-up for quotation ${existingQuotation.projectOrClientName} - Stage changed to ${normalizedStage}`,
          status: "SCHEDULED",
          followUpDate: followUpDate,
          notes: `Auto-generated follow-up for quotation stage change to ${normalizedStage}`,
          timezone: "Asia/Kolkata",
          createdById: parseInt(user.id),
          opportunityId: existingQuotation.opportunityId,
          companyId: existingQuotation.companyId,
          updatedAt: new Date()
        }
      });
    } catch (followUpError) {
      console.error('Error creating follow-up for stage change:', followUpError);
      // Don't fail the stage update if follow-up creation fails
    }

    let message = `Quotation stage updated to ${normalizedStage}`;
    if (normalizedStage === 'DONE') {
      message = "Quotation marked as done and opportunity has been unfrozen";
    } else if (freezeStages.has(normalizedStage)) {
      message = `Quotation stage updated to ${normalizedStage}. Opportunity remains frozen while the quotation is in progress.`;
    } else if (opportunityStillFrozen === true) {
      message = `Quotation stage updated to ${normalizedStage}. Opportunity stays frozen because other quotations are still pending.`;
    } else {
      message = `Quotation stage updated to ${normalizedStage}. Opportunity has been unfrozen.`;
    }

    return NextResponse.json({
      success: true,
      quotation: updatedQuotation,
      message
    });

  } catch (error: unknown) {
    console.error("Error updating quotation stage:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update quotation stage", details: errorMessage },
      { status: 500 }
    );
  }
}
