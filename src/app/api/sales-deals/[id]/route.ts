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

// GET /api/sales-deals/[id] - Get a specific sales deal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: "Invalid deal ID" },
        { status: 400 }
      );
    }

    const deal = await prisma.sales_deals.findFirst({
      where: {
        id: parsedId,
        ...(user.role === 'admin' ? {} : { ownerId: user.id })
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            province: true,
            status: true,
            sizeClass: true,
            funding: true,
            contractor: true,
            consultant: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        province_water_mappings: {
          select: {
            id: true,
            waterCompany: true,
            province: true,
            companyType: true,
            companyRating: true,
            reliabilityScore: true,
            pic: true,
            waterCompanyContacts: true,
            contractors: true,
            contractorContacts: true
          }
        },
        daily_follow_ups: {
          select: {
            id: true,
            actionType: true,
            actionDescription: true,
            status: true,
            followUpDate: true,
            notes: true,
            effectivenessScore: true,
            users: {
              select: { name: true }
            }
          },
          orderBy: { followUpDate: 'desc' }
        },
        immediate_sales: {
          select: {
            id: true,
            contractor: true,
            status: true,
            valueOfOrder: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        pending_quotations: {
          select: {
            id: true,
            projectOrClientName: true,
            orderValue: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
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

    if (!deal) {
      return NextResponse.json(
        { error: "Sales deal not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deal });

  } catch (error) {
    console.error("Error fetching sales deal:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales deal" },
      { status: 500 }
    );
  }
}

// PUT /api/sales-deals/[id] - Update a sales deal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: "Invalid deal ID" },
        { status: 400 }
      );
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

    // Check if deal exists and user has access
    const existingDeal = await prisma.sales_deals.findFirst({
      where: {
        id: parsedId,
        ...(user.role === 'admin' ? {} : { ownerId: user.id })
      }
    });

    if (!existingDeal) {
      return NextResponse.json(
        { error: "Sales deal not found or access denied" },
        { status: 404 }
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

    const updatedDeal = await prisma.sales_deals.update({
      where: { id: parsedId },
      data: {
        ...(name && { name }),
        ...(projectId !== undefined && { projectId: projectId ? parseInt(projectId) : null }),
        ...(currentStatus && { currentStatus }),
        ...(orderValue !== undefined && { orderValue: orderValue ? parseFloat(orderValue) : null }),
        ...(contractor !== undefined && { contractor }),
        ...(consultant !== undefined && { consultant }),
        ...(pipeSizeClass !== undefined && { pipeSizeClass }),
        ...(length !== undefined && { length: length ? parseFloat(length) : null }),
        ...(tonnage !== undefined && { tonnage: tonnage ? parseFloat(tonnage) : null }),
        ...(expectedCloseDate !== undefined && {
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null
        }),
        ...(province !== undefined && { province }),
        ...(keyContact !== undefined && { keyContact }),
        ...(dealPhotos !== undefined && { dealPhotos }),
        ...(isQuotationPending !== undefined && { isQuotationPending }),
        ...(dealHealth && { dealHealth }),
        ...(conversionProbability !== undefined && {
          conversionProbability: conversionProbability ? parseFloat(conversionProbability) : null
        }),
        ...(riskLevel && { riskLevel }),
        ...(provinceWaterMappingId !== undefined && {
          provinceWaterMappingId: provinceWaterMappingId ? parseInt(provinceWaterMappingId) : null
        })
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

    return NextResponse.json({ deal: updatedDeal });

  } catch (error) {
    console.error("Error updating sales deal:", error);
    return NextResponse.json(
      { error: "Failed to update sales deal" },
      { status: 500 }
    );
  }
}

// DELETE /api/sales-deals/[id] - Delete a sales deal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: "Invalid deal ID" },
        { status: 400 }
      );
    }

    // Check if deal exists and user has access
    const deal = await prisma.sales_deals.findFirst({
      where: {
        id: parsedId,
        ...(user.role === 'admin' ? {} : { ownerId: user.id })
      },
      include: {
        _count: {
          select: {
            daily_follow_ups: true,
            immediate_sales: true,
            pending_quotations: true
          }
        }
      }
    });

    if (!deal) {
      return NextResponse.json(
        { error: "Sales deal not found or access denied" },
        { status: 404 }
      );
    }

    // Prevent deletion if there are active relationships
    const { _count } = deal;
    if (_count.daily_follow_ups > 0 || _count.immediate_sales > 0 || _count.pending_quotations > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete deal with active relationships",
          details: {
            dailyFollowUps: _count.daily_follow_ups,
            immediateSales: _count.immediate_sales,
            pendingQuotations: _count.pending_quotations
          }
        },
        { status: 409 }
      );
    }

    await prisma.sales_deals.delete({
      where: { id: parsedId }
    });

    return NextResponse.json({
      message: "Sales deal deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting sales deal:", error);
    return NextResponse.json(
      { error: "Failed to delete sales deal" },
      { status: 500 }
    );
  }
}
