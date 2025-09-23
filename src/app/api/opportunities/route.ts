import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers
      .get("cookie")
      ?.split("token=")[1]
      ?.split(";")[0];
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

// GET /api/opportunities - Get all opportunities for the authenticated user
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunities = await prisma.opportunities.findMany({
      where: user.role === "admin" ? {} : { ownerId: user.id },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            contacts: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        users: {
          select: { name: true, email: true, role: true },
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
      },
      orderBy: { createdDate: "desc" },
    });

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Create a new opportunity
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      companyId,
      leadId,
      stage,
      dealSize,
      probability,
      classification,
      expectedCloseDate,
      nextFollowupDate,
      sizeDI,
      status,
      quantity,
      // Enhanced contact management
      primaryContactId,
      championContactId,
      decisionMakerId,
      // Opportunity intelligence
      winProbability,
      competitorAnalysis,
      uniqueValueProposition,
      riskFactors,
      timeToClose,
      dealComplexity,
      // Pipeline analytics
      stageVelocity,
      totalTimeInPipeline,
      bottleneckRisk,
      conversionConfidence,
      // Automated features
      nextActionRequired,
      nextActionType,
      nextActionDue,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Opportunity name is required" },
        { status: 400 }
      );
    }
    // Validate company exists if provided and not new company, else create new company if new company is provided
    if (companyId) {
      const existingCompany = await prisma.companies.findFirst({
        where: {
          id: parseInt(companyId),
        },
      });
      if (!existingCompany) {
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
          ownerId: user.role === "admin" ? undefined : user.id,
        },
      });
      if (!lead) {
        return NextResponse.json(
          { error: "Lead not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate contact relationships if provided
    if (primaryContactId) {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(primaryContactId),
          companyId: companyId ? parseInt(companyId) : undefined,
        },
      });
      if (!contact) {
        return NextResponse.json(
          {
            error: "Primary contact not found or doesn't belong to the company",
          },
          { status: 400 }
        );
      }
    }

    if (championContactId) {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(championContactId),
          companyId: companyId ? parseInt(companyId) : undefined,
        },
      });
      if (!contact) {
        return NextResponse.json(
          {
            error:
              "Champion contact not found or doesn't belong to the company",
          },
          { status: 400 }
        );
      }
    }

    if (decisionMakerId) {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(decisionMakerId),
          companyId: companyId ? parseInt(companyId) : undefined,
        },
      });
      if (!contact) {
        return NextResponse.json(
          {
            error:
              "Decision maker contact not found or doesn't belong to the company",
          },
          { status: 400 }
        );
      }
    }

    // Validate enum fields
    const validStages = [
      "PROSPECTING",
      "QUALIFICATION",
      "PROPOSAL",
      "NEGOTIATION",
      "CLOSED_WON",
      "CLOSED_LOST",
    ];
    if (stage && !validStages.includes(stage)) {
      return NextResponse.json(
        { error: "Invalid opportunity stage", validStages },
        { status: 400 }
      );
    }

    const validClassifications = ["ENTERPRISE", "MID_MARKET", "SMALL_BUSINESS"];
    if (classification && !validClassifications.includes(classification)) {
      return NextResponse.json(
        { error: "Invalid deal classification", validClassifications },
        { status: 400 }
      );
    }

    const validComplexities = ["LOW", "MEDIUM", "HIGH", "ENTERPRISE"];
    if (dealComplexity && !validComplexities.includes(dealComplexity)) {
      return NextResponse.json(
        { error: "Invalid deal complexity", validComplexities },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (
      winProbability !== undefined &&
      (typeof winProbability !== "number" ||
        winProbability < 0 ||
        winProbability > 100)
    ) {
      return NextResponse.json(
        { error: "Win probability must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    if (
      probability !== undefined &&
      (typeof probability !== "number" || probability < 0 || probability > 100)
    ) {
      return NextResponse.json(
        { error: "Probability must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    const opportunity = await prisma.opportunities.create({
      data: {
        // Core fields
        name,
        companyId: companyId ? parseInt(companyId) : null,
        leadId: leadId ? parseInt(leadId) : null,
        stage: (stage || "PROSPECTING") as any,
        dealSize: dealSize ? parseFloat(dealSize) : 0,
        probability: probability ? parseInt(probability) : 0,
        classification: (classification || "SMALL_BUSINESS") as any,
        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate)
          : null,
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
        ownerId: user.id,
        updatedAt: new Date(),
        sizeDI: sizeDI || null,
        status: status || "",
        quantity: quantity || null,

        // Enhanced contact management
        primaryContactId: primaryContactId ? parseInt(primaryContactId) : null,
        championContactId: championContactId
          ? parseInt(championContactId)
          : null,
        decisionMakerId: decisionMakerId ? parseInt(decisionMakerId) : null,

        // Opportunity intelligence
        winProbability: winProbability || 0.0,
        competitorAnalysis: competitorAnalysis || null,
        uniqueValueProposition: uniqueValueProposition || null,
        riskFactors: riskFactors || null,
        timeToClose: timeToClose || null,
        dealComplexity: (dealComplexity as any) || "MEDIUM",

        // Pipeline analytics
        stageVelocity: stageVelocity || null,
        totalTimeInPipeline: totalTimeInPipeline || null,
        bottleneckRisk: bottleneckRisk || 0.0,
        conversionConfidence: conversionConfidence || 0.0,

        // Automated features
        nextActionRequired: nextActionRequired || false,
        nextActionType: nextActionType || null,
        nextActionDue: nextActionDue ? new Date(nextActionDue) : null,
      },
      include: {
        companies: {
          select: { id: true, name: true, type: true },
        },
        users: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    console.error("Error creating opportunity:", error);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
