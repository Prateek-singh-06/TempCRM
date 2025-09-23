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

// GET /api/sales-deals - Get all sales deals with filtering and search
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const province = searchParams.get("province");
    const ownerId = searchParams.get("ownerId");
    const search = searchParams.get("search");
    const minValue = searchParams.get("minValue");
    const maxValue = searchParams.get("maxValue");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    // Filter by current user if not admin
    if (user.role !== 'admin' && !ownerId) {
      where.ownerId = user.id;
    }

    if (status) {
      where.currentStatus = status;
    }

    if (province) {
      where.province = { contains: province, mode: 'insensitive' };
    }

    if (ownerId) {
      where.ownerId = parseInt(ownerId);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contractor: { contains: search, mode: 'insensitive' } },
        { consultant: { contains: search, mode: 'insensitive' } },
        { keyContact: { contains: search, mode: 'insensitive' } },
        { project: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (minValue || maxValue) {
      where.orderValue = {};
      if (minValue) where.orderValue.gte = parseFloat(minValue);
      if (maxValue) where.orderValue.lte = parseFloat(maxValue);
    }

    const [deals, total] = await Promise.all([
      prisma.sales_deals.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              province: true,
              status: true
            }
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          province_water_mappings: {
            select: {
              id: true,
              waterCompany: true,
              province: true,
              companyRating: true
            }
          },
          daily_follow_ups: {
            select: {
              id: true,
              actionType: true,
              status: true,
              followUpDate: true
            },
            orderBy: { followUpDate: 'desc' },
            take: 3
          },
          _count: {
            select: {
              daily_follow_ups: true,
              immediate_sales: true,
              pending_quotations: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.sales_deals.count({ where })
    ]);

    return NextResponse.json({
      deals,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error("Error fetching sales deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales deals" },
      { status: 500 }
    );
  }
}

// POST /api/sales-deals - Create a new sales deal
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      projectId,
      currentStatus,
      orderValue,
      contractor,
      consultant,
      pipeSizeClass,
      length,
      tonnage,
      expectedCloseDate,
      province,
      keyContact,
      dealPhotos,
      isQuotationPending,
      dealHealth,
      conversionProbability,
      riskLevel,
      provinceWaterMappingId
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "Deal name is required" },
        { status: 400 }
      );
    }

    // Validate project exists if provided
    if (projectId) {
      const project = await prisma.projects.findFirst({
        where: {
          id: parseInt(projectId),
          ownerId: user.id
        }
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 400 }
        );
      }
    }

    // Validate province water mapping if provided
    if (provinceWaterMappingId) {
      const mapping = await prisma.province_water_mappings.findUnique({
        where: { id: parseInt(provinceWaterMappingId) }
      });

      if (!mapping) {
        return NextResponse.json(
          { error: "Province water mapping not found" },
          { status: 400 }
        );
      }
    }

    const deal = await prisma.sales_deals.create({
      data: {
        name,
        projectId: projectId ? parseInt(projectId) : null,
        currentStatus: (currentStatus || "BIDDING") as any,
        orderValue: orderValue ? parseFloat(orderValue) : null,
        ownerId: user.id,
        contractor,
        consultant,
        pipeSizeClass,
        length: length ? parseFloat(length) : null,
        tonnage: tonnage ? parseFloat(tonnage) : null,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        province,
        keyContact,
        dealPhotos,
        isQuotationPending: isQuotationPending || false,
        dealHealth: (dealHealth || "GOOD") as any,
        conversionProbability: conversionProbability ? parseFloat(conversionProbability) : null,
        riskLevel: (riskLevel || "LOW") as any,
        provinceWaterMappingId: provinceWaterMappingId ? parseInt(provinceWaterMappingId) : null,
        updatedAt: new Date()
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            province: true,
            status: true
          }
        },
          users: {
            select: {
              id: true,
              name: true,
            email: true
          }
        },
        province_water_mappings: {
          select: {
            id: true,
            waterCompany: true,
            province: true,
            companyRating: true
          }
        },
        _count: {
          select: {
            daily_follow_ups: true,
            immediate_sales: true,
            pending_quotations: true
          }
        }
      }
    });

    return NextResponse.json({ deal }, { status: 201 });

  } catch (error) {
    console.error("Error creating sales deal:", error);
    return NextResponse.json(
      { error: "Failed to create sales deal" },
      { status: 500 }
    );
  }
}
