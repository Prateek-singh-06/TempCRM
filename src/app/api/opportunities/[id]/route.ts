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

// GET /api/opportunities/[id] - Get a specific opportunity
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
    const opportunityId = parseInt(resolvedParams.id);
    if (isNaN(opportunityId)) {
      return NextResponse.json({ error: "Invalid opportunity ID" }, { status: 400 });
    }

    const opportunity = await prisma.opportunities.findFirst({
      where: {
        id: opportunityId,
        ...(user.role !== "admin" && { ownerId: user.id }),
      },
      include: {
        companies: true,
        users: {
          select: { name: true, email: true }
        },
        pending_quotations: {
          select: {
            id: true,
            status: true,
            quotationDocument: true,
            totalQty: true,
            orderValue: true,
          }
        }
      }
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

// PUT /api/opportunities/[id] - Update an opportunity
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
    const opportunityId = parseInt(resolvedParams.id);
    if (isNaN(opportunityId)) {
      return NextResponse.json({ error: "Invalid opportunity ID" }, { status: 400 });
    }
    
    const body = await request.json();
    const {
      name,
      status,
      sizeDI,
      quantity,
      companyId,
      leadId,
      stage,
      dealSize,
      probability,
      classification,
      expectedCloseDate,
      nextFollowupDate,
      wonDate,
      note,
      isFrozen,
      frozenReason
    } = body;
    
    // Check if opportunity exists and belongs to user
    const existingOpportunity = await prisma.opportunities.findFirst({
      where: {
        id: opportunityId,
        ...(user.role !== "admin" && { ownerId: user.id }),
      }
    });

    if (!existingOpportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }else if(existingOpportunity.stage==="CLOSED_WON" && stage&&stage!=="CLOSED_WON"){
      return NextResponse.json({ error: "Cannot change stage from CLOSED_WON to another stage" }, { status: 400 });
    }
    
    // Validate company exists if provided
    if (companyId) {
      const company = await prisma.companies.findFirst({
        where: {
          id: parseInt(companyId),
        }
      });
      if (!company) {
        return NextResponse.json(
          { error: "Company not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate lead exists if provided
    if (leadId) {
      const lead = await prisma.leads.findFirst({
        where: {
          id: parseInt(leadId),
          ownerId: user.role === "admin" ? {} : user.id
        }
      });
      if (!lead) {
        return NextResponse.json(
          { error: "Lead not found or access denied" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      ...(name && { name }),
      ...(status && { status }),
      ...(sizeDI && { sizeDI }),
      ...(quantity && { quantity }),
      ...(companyId && { companyId: parseInt(companyId) }),
      ...(leadId && { leadId: parseInt(leadId) }),
      ...(stage && { stage }),
      ...(dealSize !== undefined && { dealSize: parseFloat(dealSize) }),
      ...(probability !== undefined && { probability: parseInt(probability) }),
      ...(classification && { classification }),
      ...(expectedCloseDate && { expectedCloseDate: new Date(expectedCloseDate) }),
      ...(nextFollowupDate && { nextFollowupDate: new Date(nextFollowupDate) }),
      ...(wonDate && { wonDate: new Date(wonDate) }),
      ...(note !== undefined && { note }),
      ...(isFrozen !== undefined && { isFrozen }),
      ...(frozenReason !== undefined && { frozenReason })
    };

    const updatedOpportunity = await prisma.opportunities.update({
      where: { id: opportunityId },
      data: updateData,
      include: {
        companies: true,
        users: {
          select: { name: true, email: true }
        },
        pending_quotations: {
          select: {
            id: true,
            status: true,
            quotationDocument: true,
            totalQty: true,
            orderValue: true,
          }
        }
      }
    });

    // Pipeline creation is temporarily disabled due to Prisma client sync issues
    // TODO: Re-enable after running 'npx prisma generate'
    /*
    // If the opportunity is being closed as won, create a pipeline record
    if (stage === "CLOSED_WON") {
      try {
        // Check if pipeline already exists for this opportunity
        const existingPipeline = await prisma.pipelines.findUnique({
          where: { opportunityId: opportunityId }
        });

        if (!existingPipeline) {
          // Create new pipeline record
          const pipeline = await prisma.pipelines.create({
            data: {
              opportunityId: opportunityId,
              companyId: updatedOpportunity.companyId,
              name: `${updatedOpportunity.name} - Pipeline`,
              status: "ORDER_RECEIVED",
              orderValue: parseFloat(dealSize) || updatedOpportunity.dealSize,
              quantity: undefined, // Will be set later from project data if available
              diameter: undefined, // Will be set later from project data if available
              specification: updatedOpportunity.competitorAnalysis || updatedOpportunity.uniqueValueProposition,
              orderDate: wonDate ? new Date(wonDate) : new Date(),
              challenges: body.challenges || "Order processing and delivery coordination",
              ownerId: updatedOpportunity.ownerId,
              notes: note || `Pipeline created from won opportunity. ${body.wonReason ? `Win Reason: ${body.wonReason}` : ''}`
            }
          });

          console.log(`Pipeline created for opportunity ${opportunityId}:`, pipeline.id);
        } else {
          console.log(`Pipeline already exists for opportunity ${opportunityId}`);
        }
      } catch (pipelineError) {
        console.error("Error creating pipeline:", pipelineError);
        // Don't fail the entire request if pipeline creation fails
      }
    }
    */

    return NextResponse.json({ opportunity: updatedOpportunity });
  } catch (error) {
    console.error("Error updating opportunity:", error);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/[id] - Delete an opportunity
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user||user.role!=='admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const opportunityId = parseInt(resolvedParams.id);
    if (isNaN(opportunityId)) {
      return NextResponse.json({ error: "Invalid opportunity ID" }, { status: 400 });
    }

    // Check if opportunity exists and belongs to user
    const existingOpportunity = await prisma.opportunities.findFirst({
      where: {
        id: opportunityId,
        ...(user.role !== "admin" && { ownerId: user.id }),
      }
    });

    if (!existingOpportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    await prisma.opportunities.delete({
      where: { id: opportunityId }
    });

    return NextResponse.json({ message: "Opportunity deleted successfully" });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    return NextResponse.json(
      { error: "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}
