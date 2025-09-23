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

// GET /api/leads/[id] - Get a specific lead
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
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        ownerId: user.role === "admin" ? undefined : user.id
      },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            region: true,
            type: true,
            address: true,
            website: true,
            contacts: true,
          }
        },
        opportunities: {
          select: {
            id: true,
            name: true,
            stage: true,
            dealSize: true,
            probability: true,
            expectedCloseDate: true,
            sizeDI: true,
            quantity: true,
            status: true,
            lastActivityDate: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        // Enhanced relationships
        contacts_leads_contactIdTocontacts: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            contactScore: true,
            engagementLevel: true,
            influenceLevel: true
          }
        },
        contacts_leads_primaryContactIdTocontacts: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            contactScore: true,
            influenceLevel: true
          }
        },
        activities: {
          select: {
            id: true,
            type: true,
            subject: true,
            occurredAt: true,
            effectiveness: true,
            outcome: true
          },
          orderBy: { occurredAt: 'desc' },
          take: 5
        },
        daily_follow_ups: {
          select: {
            id: true,
            actionType: true,
            actionDescription: true,
            status: true,
            followUpDate: true,
            urgencyLevel: true,
            priorityScore: true,
            expectedOutcome: true,
            actualOutcome: true,
            completionQuality: true,
            notes: true,
            channelUsed: true,
            timeSpent: true,
            responseReceived: true,
            responseQuality: true,
            nextActionDate: true,
            nextActionNotes: true,
            createdAt: true,
            updatedAt: true,
            companies: { select: { id: true, name: true } },
            contacts: { select: { id: true, name: true, role: true } },
            users: { select: { id: true, name: true, email: true } }
          },
          orderBy: { followUpDate: 'desc' }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch lead", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// PUT /api/leads/[id] - Update a lead
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
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const body = await request.json();

    // Check if lead exists and belongs to user
    const existingLead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        ownerId: user.role === "admin" ? {} : user.id
      }
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    let updateData: any = {};

    // Handle both direct field updates and editLead object
    const fieldsToUpdate = body.editLead || body;

    // Core fields
    if (fieldsToUpdate.name !== undefined || fieldsToUpdate.name !== null) updateData.name = fieldsToUpdate.name;
    if (fieldsToUpdate.companyId !== undefined || fieldsToUpdate.companyId !== null) updateData.company = fieldsToUpdate.company;
    if (fieldsToUpdate.source !== undefined || fieldsToUpdate.source !== null) updateData.source = fieldsToUpdate.source;
    if (fieldsToUpdate.email !== undefined || fieldsToUpdate.email !== null) updateData.email = fieldsToUpdate.email;
    if (fieldsToUpdate.phone !== undefined || fieldsToUpdate.phone !== null) updateData.phone = fieldsToUpdate.phone;
    if (fieldsToUpdate.note !== undefined || fieldsToUpdate.note !== null) updateData.note = fieldsToUpdate.note;
    if (fieldsToUpdate.status !== undefined || fieldsToUpdate.status !== null) updateData.status = fieldsToUpdate.status;

    // Enhanced contact relationships
    if (fieldsToUpdate.contactId !== undefined) updateData.contactId = fieldsToUpdate.contactId ? parseInt(fieldsToUpdate.contactId) : null;
    if (fieldsToUpdate.primaryContactId !== undefined) updateData.primaryContactId = fieldsToUpdate.primaryContactId ? parseInt(fieldsToUpdate.primaryContactId) : null;

    // Lead qualification fields
    if (fieldsToUpdate.leadScore !== undefined) updateData.leadScore = parseFloat(fieldsToUpdate.leadScore);
    if (fieldsToUpdate.qualificationStage !== undefined) updateData.qualificationStage = fieldsToUpdate.qualificationStage;
    if (fieldsToUpdate.budgetRange !== undefined) updateData.budgetRange = fieldsToUpdate.budgetRange;
    if (fieldsToUpdate.timeline !== undefined) updateData.timeline = fieldsToUpdate.timeline;
    if (fieldsToUpdate.decisionMaker !== undefined) updateData.decisionMaker = fieldsToUpdate.decisionMaker;
    if (fieldsToUpdate.painPoints !== undefined) updateData.painPoints = fieldsToUpdate.painPoints;
    if (fieldsToUpdate.authorityLevel !== undefined) updateData.authorityLevel = fieldsToUpdate.authorityLevel;
    if (fieldsToUpdate.buyingProcessStage !== undefined) updateData.buyingProcessStage = fieldsToUpdate.buyingProcessStage;

    // Automated qualification
    if (fieldsToUpdate.autoQualificationScore !== undefined) updateData.autoQualificationScore = parseFloat(fieldsToUpdate.autoQualificationScore);
    if (fieldsToUpdate.nextFollowUpDate !== undefined) updateData.nextFollowUpDate = fieldsToUpdate.nextFollowUpDate ? new Date(fieldsToUpdate.nextFollowUpDate) : null;
    if (fieldsToUpdate.engagementScore !== undefined) updateData.engagementScore = parseFloat(fieldsToUpdate.engagementScore);

    // Always update the updatedAt field
    updateData.updatedAt = new Date();

    const updatedLead = await prisma.leads.update({
      where: { id: leadId },
      data: updateData,
      include: {
        users: {
          select: { name: true, email: true, role: true}
        },
        contacts_leads_contactIdTocontacts: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            contactScore: true,
            engagementLevel: true
          }
        },
        contacts_leads_primaryContactIdTocontacts: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            contactScore: true,
            influenceLevel: true
          }
        }
      }
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update lead", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// DELETE /api/leads/[id] - Delete a lead
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
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Check if lead exists and belongs to user
    const existingLead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        ownerId: user.role=== "admin" ? {} : user.id
      }
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.leads.delete({
      where: { id: leadId }
    });

    return NextResponse.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete lead", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// POST /api/leads/[id]/convert - Convert lead to opportunity
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      dealSize,
      probability,
      expectedCloseDate
    } = body;

    // Check if lead exists and belongs to user
    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        ownerId: user.id
      }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if opportunity already exists for this lead
    const existingOpportunity = await prisma.opportunities.findFirst({
      where: {
        leadId: leadId,
        ownerId: user.id
      }
    });

    if (existingOpportunity) {
      return NextResponse.json({ error: "Opportunity already exists for this lead" }, { status: 409 });
    }

    // Create opportunity from lead
    const opportunity = await prisma.opportunities.create({
      data: {
        name: `${lead.name} - Opportunity`,
        companyId: (lead as any).companyId,
        leadId: leadId,
        dealSize: dealSize ? parseFloat(dealSize) : 0,
        probability: probability ? parseInt(probability) : 25,
        stage: "PROSPECTING",
        classification: "SMALL_BUSINESS",
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        nextFollowupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        ownerId: user.id,
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: { name: true, email: true }
        }
      }
    });

    // Update lead status to show it's been converted
    await prisma.leads.update({
      where: { id: leadId },
      data: {
        status: "qualified",
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: "Lead converted to opportunity successfully",
      opportunity
    }, { status: 201 });

  } catch (error) {
    console.error("Error converting lead to opportunity:", error);
    return new Response(
      JSON.stringify({ error: "Failed to convert lead to opportunity", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
