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

// GET /api/province-water-mappings - Get all province water mappings with filtering
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const province = searchParams.get("province");
    const companyType = searchParams.get("companyType");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (province) {
      where.province = { contains: province, mode: 'insensitive' };
    }

    if (companyType) {
      where.companyType = companyType;
    }

    if (search) {
      where.OR = [
        { waterCompany: { contains: search, mode: 'insensitive' } },
        { province: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [mappings, total] = await Promise.all([
      prisma.province_water_mappings.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true
            },
            take: 3
          },
          immediate_sales: {
            select: {
              id: true,
              contractor: true,
              status: true,
              createdAt: true
            },
            take: 3
          },
          sales_deals: {
            select: {
              id: true,
              name: true,
              currentStatus: true,
              createdAt: true
            },
            take: 3
          },
          _count: {
            select: {
              projects: true,
              immediate_sales: true,
              sales_deals: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.province_water_mappings.count({ where })
    ]);

    return NextResponse.json({
      mappings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error("Error fetching province water mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch province water mappings" },
      { status: 500 }
    );
  }
}

// POST /api/province-water-mappings - Create a new province water mapping
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      waterCompany,
      province,
      companyType,
      waterCompanyContacts,
      contractors,
      contractorContacts,
      traders,
      traderContacts,
      consultants,
      consultantContacts,
      pic,
      companyRating,
      reliabilityScore,
      lastInteractionDate
    } = body;

    // Validation
    if (!waterCompany || !province || !companyType) {
      return NextResponse.json(
        { error: "Water company, province, and company type are required" },
        { status: 400 }
      );
    }

    // Check for duplicate water company
    const existing = await prisma.province_water_mappings.findUnique({
      where: { waterCompany }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Water company already exists" },
        { status: 409 }
      );
    }

    const mapping = await prisma.province_water_mappings.create({
      data: {
        waterCompany,
        province,
        companyType,
        waterCompanyContacts,
        contractors,
        contractorContacts,
        traders,
        traderContacts,
        consultants,
        consultantContacts,
        pic,
        companyRating: companyRating || "MEDIUM",
        reliabilityScore,
        lastInteractionDate: lastInteractionDate ? new Date(lastInteractionDate) : null,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            projects: true,
            immediate_sales: true,
            sales_deals: true
          }
        }
      }
    });

    return NextResponse.json({ mapping }, { status: 201 });

  } catch (error) {
    console.error("Error creating province water mapping:", error);
    return NextResponse.json(
      { error: "Failed to create province water mapping" },
      { status: 500 }
    );
  }
}
