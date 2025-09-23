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

// GET /api/companies - Get all companies for the authenticated user
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let companies = await prisma.companies.findMany({
      where: user.role=== "admin" ? {} : { ownerId: user.id },
      include: {
        opportunities: { select: { id: true, name: true, quantity: true, stage: true, status: true } },
        contacts: true,
        // leads: { select: { id: true, status: true, name: true, email: true,  } },
        users: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdDate: "desc" }
    });

    // Calculate aggregated fields from opportunities
    companies = companies.map(company => ({
      ...company,
      totalOpportunities: company.opportunities.length,
      totalQuantity: company.opportunities.reduce((acc, opp) => acc + (opp.quantity || 0), 0),
      openDeals: company.opportunities.filter(opp => opp.stage !== 'CLOSED_WON' && opp.stage !== 'CLOSED_LOST').length,
    }));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, region, type, address, website, contacts } = body;

    // Enhanced validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Company name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!region || typeof region !== 'string' || region.trim().length === 0) {
      return NextResponse.json(
        { error: "region is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      return NextResponse.json(
        { error: "Company type is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate contacts array
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "At least one contact is required" },
        { status: 400 }
      );
    }

    // Validate first contact has required fields
    const firstContact = contacts[0];
    if (!firstContact.name || !firstContact.email) {
      return NextResponse.json(
        { error: "First contact must have name and email" },
        { status: 400 }
      );
    }
    
    // Validate company type
    const validTypes = ['PRIVATE', 'GOVERNMENT', 'MIXED', 'JOINT_STOCK', 'TRADER', 'CONTRACTOR', 'CONSULTANT'];
    if (!validTypes.includes(type.trim())) {
      return NextResponse.json(
        { error: `Company type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate website URL if provided 
    if (website) {
      if (typeof website !== 'string') {
        return NextResponse.json(
          { error: "Website must be a string" },
          { status: 400 }
        );
      }
      try {
        new URL(website.trim());
      } catch {
        return NextResponse.json(
          { error: "Website must be a valid URL" },
          { status: 400 }
        );
      }
    }
    
    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedregion = region.trim();
    const sanitizedType = type.trim();
    const sanitizedAddress = address ? address.trim() : null;
    const sanitizedWebsite = website ? website.trim() : null;

    // Check if company name already exists
    const existingCompany = await prisma.companies.findFirst({
      where: { name: sanitizedName},
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this name already exists" },
        { status: 400 }
      );
    }

    const company = await prisma.companies.create({
      data: {
        name: sanitizedName,
        region: sanitizedregion, 
        type: sanitizedType,
        address: sanitizedAddress,
        website: sanitizedWebsite,
        ownerId: user.id,
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: { name: true, email: true }
        }
      }
    });
    const existingContact= await prisma.contacts.findMany({
      where: { email: contacts[0].email },
    });
    if(existingContact.length>0){
      await prisma.contacts.update({
        where: { id: existingContact[0].id },
        data: {
          companyId: company.id
        }
      });
    }
    else{
      await prisma.contacts.create({
        data: {
          name: contacts[0].name,
          role: contacts[0].role,
          email: contacts[0].email,
          phone: contacts[0].phone,
          companyId: company.id
        }
      });
    }


    return NextResponse.json({ company }, { status: 200 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
