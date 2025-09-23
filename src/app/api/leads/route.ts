import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper function to get user company IDs for access control
interface User {
  id: number;
  role: string;
}

async function getUserCompanyIds(user: User): Promise<number[]> {
  if (user.role === "admin") {
    const companies = await prisma.companies.findMany({ select: { id: true } });
    return companies.map((c: { id: number }) => c.id);
  } else {
    const companies = await prisma.companies.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    return companies.map((c: { id: number }) => c.id);
  }
}

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
// GET /api/leads - Get all leads for the authenticated user
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.leads.findMany({
      where: user.role === "admin" ? {} : { ownerId: user.id },
      select: {
        id: true,
        name: true,
        source: true,
        status: true,
        qualificationStage: true,
        nextFollowUpDate: true,
        email: true,
        phone: true,
        note: true,
        createdDate: true,
        users: {
          select: { name: true, email: true, employeeCode: true, role: true },
        },
        companies: {
          select: { id: true, name: true, region: true }
        }
      },

      orderBy: { createdDate: "desc" },
    });

    // For now, return leads without companies to avoid database errors
    // TODO: Add proper company relationship when database is properly migrated
    // const leadsWithCompanies = leads.map(lead => ({
    //   ...lead,
    //   companies: null, // Placeholder until companyId column is properly added
    // }));

    return NextResponse.json({ leads: leads });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch leads", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
// POST /api/leads - Create a new lead
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
      source,
      email,
      phone,
      // Enhanced contact relationships
      contactId,
      primaryContactId,
      // Lead qualification fields
      leadScore,
      qualificationStage,
      budgetRange,
      timeline,
      decisionMaker,
      painPoints,
      authorityLevel,
      buyingProcessStage,
      // Automated qualification
      autoQualificationScore,
      nextFollowUpDate,
      engagementScore,
      note,
      eventDetails,
    } = body;

    // Enhanced validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const existingCompany = await prisma.companies.findFirst({
      where: {
        id: companyId,
      },
    });
    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }
    if (!source || typeof source !== "string" || source.trim().length === 0) {
      return NextResponse.json(
        { error: "Source is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Basic phone validation if provided
    if (phone && typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone must be a string" },
        { status: 400 }
      );
    }

    // Validate contact relationships if provided
    if (contactId) {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(contactId),
          companyId: { in: await getUserCompanyIds(user) },
        },
      });
      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found or access denied" },
          { status: 400 }
        );
      }
    }

    if (primaryContactId) {
      const primaryContact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(primaryContactId),
          companyId: { in: await getUserCompanyIds(user) },
        },
      });
      if (!primaryContact) {
        return NextResponse.json(
          { error: "Primary contact not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate enum fields
    const validQualificationStages = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL",
      "NEGOTIATION",
      "CLOSED_WON",
      "CLOSED_LOST",
    ];
    if (
      qualificationStage &&
      !validQualificationStages.includes(qualificationStage)
    ) {
      return NextResponse.json(
        {
          error: "Invalid qualification stage",
          validStages: validQualificationStages,
        },
        { status: 400 }
      );
    }

    const validAuthorityLevels = [
      "DECISION_MAKER",
      "INFLUENCER",
      "GATEKEEPER",
      "USER",
      "END_USER",
    ];
    if (authorityLevel && !validAuthorityLevels.includes(authorityLevel)) {
      return NextResponse.json(
        { error: "Invalid authority level", validLevels: validAuthorityLevels },
        { status: 400 }
      );
    }

    // const validBuyingStages = ['UNAWARE', 'AWARE', 'INTERESTED', 'EVALUATING', 'NEGOTIATING', 'PURCHASE'];
    // if (buyingProcessStage && !validBuyingStages.includes(buyingProcessStage)) {
    //   return NextResponse.json(
    //     { error: "Invalid buying process stage", validStages: validBuyingStages },
    //     { status: 400 }
    //   );
    // }

    // // Validate numeric fields
    // if (leadScore !== undefined && (typeof leadScore !== 'number' || leadScore < 0 || leadScore > 100)) {
    //   return NextResponse.json(
    //     { error: "Lead score must be a number between 0 and 100" },
    //     { status: 400 }
    //   );
    // }

    // if (engagementScore !== undefined && (typeof engagementScore !== 'number' || engagementScore < 0 || engagementScore > 100)) {
    //   return NextResponse.json(
    //     { error: "Engagement score must be a number between 0 and 100" },
    //     { status: 400 }
    //   );
    // }

    // Validate contact relationships if provided
    if (contactId) {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(contactId),
          companyId: { in: await getUserCompanyIds(user) },
        },
      });
      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found or access denied" },
          { status: 400 }
        );
      }
    }

    if (primaryContactId) {
      const primaryContact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(primaryContactId),
          companyId: { in: await getUserCompanyIds(user) },
        },
      });
      if (!primaryContact) {
        return NextResponse.json(
          { error: "Primary contact not found or access denied" },
          { status: 400 }
        );
      }
    }

    // // Validate enum fields
    // const validQualificationStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    // if (qualificationStage && !validQualificationStages.includes(qualificationStage)) {
    //   return NextResponse.json(
    //     { error: "Invalid qualification stage", validStages: validQualificationStages },
    //     { status: 400 }
    //   );
    // }

    // const validAuthorityLevels = ['DECISION_MAKER', 'INFLUENCER', 'GATEKEEPER', 'USER', 'END_USER'];
    // if (authorityLevel && !validAuthorityLevels.includes(authorityLevel)) {
    //   return NextResponse.json(
    //     { error: "Invalid authority level", validLevels: validAuthorityLevels },
    //     { status: 400 }
    //   );
    // }

    // const validBuyingStages = ['UNAWARE', 'AWARE', 'INTERESTED', 'EVALUATING', 'NEGOTIATING', 'PURCHASE'];
    // if (buyingProcessStage && !validBuyingStages.includes(buyingProcessStage)) {
    //   return NextResponse.json(
    //     { error: "Invalid buying process stage", validStages: validBuyingStages },
    //     { status: 400 }
    //   );
    // }

    // Validate numeric fields
    if (
      leadScore !== undefined &&
      (typeof leadScore !== "number" || leadScore < 0 || leadScore > 100)
    ) {
      return NextResponse.json(
        { error: "Lead score must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    if (
      engagementScore !== undefined &&
      (typeof engagementScore !== "number" ||
        engagementScore < 0 ||
        engagementScore > 100)
    ) {
      return NextResponse.json(
        { error: "Engagement score must be a number between 0 and 100" },
        { status: 400 }
      );
    }
    const sanitizedName = name.trim();
    const sanitizedCompany = existingCompany.name; // Use company name instead of ID
    const sanitizedSource = source.trim();
    const sanitizedEmail = email ? email.trim().toLowerCase() : null;
    const sanitizedPhone = phone ? phone.trim() : null;

    const lead = await prisma.leads.create({
      data: {
        // Core fields
        name: sanitizedName,
        companyId: parseInt(companyId),
        note: note || "",
        source: sanitizedSource,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        ownerId: user.id,
        updatedAt: new Date(),
        status: "new", // Default status for new leads
        eventDetails: eventDetails || null,
        // Enhanced contact relationships
        contactId: contactId ? parseInt(contactId) : null,
        primaryContactId: primaryContactId ? parseInt(primaryContactId) : null,

        // Lead qualification fields
        leadScore: leadScore || 0.0,
        qualificationStage: (qualificationStage as any) || "NEW",
        budgetRange: budgetRange || null,
        timeline: timeline || null,
        decisionMaker: decisionMaker || null,
        painPoints: painPoints || null,
        authorityLevel: authorityLevel ? (authorityLevel as any) : null,
        buyingProcessStage: buyingProcessStage
          ? (buyingProcessStage as any)
          : null,

        // Automated qualification
        autoQualificationScore: autoQualificationScore || 0.0,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        engagementScore: engagementScore || 0.0,
      } as any,
      include: {
        users: {
          select: { name: true, email: true, employeeCode: true },
        },
        contacts_leads_contactIdTocontacts: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            contactScore: true,
          },
        },
        contacts_leads_primaryContactIdTocontacts: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            contactScore: true,
          },
        },
      },
    });

    return NextResponse.json({ lead }, { status: 200 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create lead", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
