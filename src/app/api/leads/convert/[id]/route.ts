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
      name,
      sizeDI,
      quantity,
      status,
      classification,
      dealSize,
      expectedCloseDate,
      stage,
      probability,
      nextFollowupDate,
      lostReason,
    } = body;

    // Check if lead exists and belongs to user
    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        ownerId: user.role === "admin" ? {} : user.id
      },
      select: {
        id: true,
        name: true,
        source: true,
        status: true,
        email: true,
        phone: true,
        note: true,
        createdDate: true,
        companyId: true as any,
        ownerId: true,
        users: {
          select: { name: true, email: true, role: true },
        },
      } as any,
    });

    // Fetch company separately if needed
    let company = null;
    if (lead && (lead as any).companyId) {
      try {
        company = await prisma.companies.findUnique({
          where: { id: (lead as any).companyId },
          select: {
            id: true,
            name: true,
            region: true,
            type: true,
            address: true,
            website: true,
          },
        });
      } catch (companyError) {
        console.error("Error fetching company:", companyError);
      }
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if opportunity already exists for this lead
    const existingOpportunity = await prisma.opportunities.findFirst({
      where: {
        leadId: leadId,
        ownerId:user.role === "admin" ? {} : user.id
      }
    });

    if (existingOpportunity) {
      return NextResponse.json({ error: "Opportunity already exists for this lead" }, { status: 409 });
    }

    // Create opportunity from lead
    const opportunity = await prisma.opportunities.create({
      data: {
        name: name || `${lead.name} - Opportunity`,
        sizeDI: sizeDI || null,
        quantity: quantity || 0,
        status: status || null,
        classification: classification || "SMALL_BUSINESS",
        companyId: company?.id || null,
        leadId: leadId,
        dealSize: dealSize ? parseFloat(dealSize) : 0,
        probability: probability ? parseInt(probability) : 25,
        stage: stage || "PROSPECTING",
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lostReason: lostReason || null,
        ownerId: (lead.users as any)?.id || (lead as any).ownerId,
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
    return NextResponse.json(
      { error: "Failed to convert lead to opportunity" },
      { status: 500 }
    );
  }
}
