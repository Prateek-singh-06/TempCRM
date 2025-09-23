import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, type AuthenticatedUser } from "@/lib/auth";
import {
  validateIdParam,
  validateProvinceWaterMappingData,
  sanitizeUpdateData,
  type ValidationResult
} from "@/lib/provinceWaterMappings/validation";

// GET /api/province-water-mappings/[id] - Get a specific province water mapping
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const user: AuthenticatedUser | null = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized access. Please log in to continue." },
        { status: 401 }
      );
    }

    // Validate ID parameter
    const idValidation = validateIdParam(id);
    if (!idValidation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: idValidation.errors
        },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);

    // Fetch the mapping with all related data
    const mapping = await prisma.province_water_mappings.findUnique({
      where: { id: parsedId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            province: true,
            createdAt: true,
            users_projects_ownerIdTousers: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        immediate_sales: {
          select: {
            id: true,
            contractor: true,
            status: true,
            valueOfOrder: true,
            createdAt: true,
            users: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        sales_deals: {
          select: {
            id: true,
            name: true,
            currentStatus: true,
            orderValue: true,
            expectedCloseDate: true,
            createdAt: true,
            users: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            projects: true,
            immediate_sales: true,
            sales_deals: true
          }
        }
      }
    });

    if (!mapping) {
      return NextResponse.json(
        {
          error: "Province water mapping not found",
          message: `No mapping exists with ID ${id}`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { mapping }
    });

  } catch (error) {
    console.error("Error fetching province water mapping:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch province water mapping. Please try again later."
      },
      { status: 500 }
    );
  }
}

// PUT /api/province-water-mappings/[id] - Update a province water mapping
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const user: AuthenticatedUser | null = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized access. Please log in to continue." },
        { status: 401 }
      );
    }

    // Validate ID parameter
    const idValidation = validateIdParam(id);
    if (!idValidation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: idValidation.errors
        },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid JSON payload",
          message: "Request body must be valid JSON"
        },
        { status: 400 }
      );
    }

    // Sanitize update data
    const sanitizedData = sanitizeUpdateData(body);

    // Validate the update data
    const dataValidation = validateProvinceWaterMappingData(sanitizedData);
    if (!dataValidation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: dataValidation.errors,
          ...(dataValidation.warnings.length > 0 && { warnings: dataValidation.warnings })
        },
        { status: 400 }
      );
    }

    // Check if mapping exists
    const existing = await prisma.province_water_mappings.findUnique({
      where: { id: parsedId }
    });

    if (!existing) {
      return NextResponse.json(
        {
          error: "Province water mapping not found",
          message: `No mapping exists with ID ${id}`
        },
        { status: 404 }
      );
    }

    // Check for duplicate water company (if name is being changed)
    if (sanitizedData.waterCompany && sanitizedData.waterCompany !== existing.waterCompany) {
      const duplicate = await prisma.province_water_mappings.findUnique({
        where: { waterCompany: sanitizedData.waterCompany }
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: "Duplicate entry",
            message: "A water company with this name already exists",
            field: "waterCompany"
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data with proper date handling
    const updateData: any = { ...sanitizedData };
    if (sanitizedData.lastInteractionDate !== undefined) {
      updateData.lastInteractionDate = sanitizedData.lastInteractionDate
        ? new Date(sanitizedData.lastInteractionDate)
        : null;
    }

    // Update the mapping
    const updatedMapping = await prisma.province_water_mappings.update({
      where: { id: parsedId },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      message: "Province water mapping updated successfully",
      data: { mapping: updatedMapping },
      ...(dataValidation.warnings.length > 0 && { warnings: dataValidation.warnings })
    });

  } catch (error) {
    console.error("Error updating province water mapping:", error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          {
            error: "Duplicate entry",
            message: "A mapping with this information already exists"
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update province water mapping. Please try again later."
      },
      { status: 500 }
    );
  }
}

// DELETE /api/province-water-mappings/[id] - Delete a province water mapping
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const user: AuthenticatedUser | null = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized access. Please log in to continue." },
        { status: 401 }
      );
    }

    // Validate ID parameter
    const idValidation = validateIdParam(id);
    if (!idValidation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: idValidation.errors
        },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);

    // Check if mapping exists and get related counts
    const mapping = await prisma.province_water_mappings.findUnique({
      where: { id: parsedId },
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

    if (!mapping) {
      return NextResponse.json(
        {
          error: "Province water mapping not found",
          message: `No mapping exists with ID ${id}`
        },
        { status: 404 }
      );
    }

    // Prevent deletion if there are active relationships
    const { _count } = mapping;
    if (_count.projects > 0 || _count.immediate_sales > 0 || _count.sales_deals > 0) {
      return NextResponse.json(
        {
          error: "Deletion not allowed",
          message: "Cannot delete mapping with active relationships. Please remove or reassign all related records first.",
          details: {
            projects: _count.projects,
            immediateSales: _count.immediate_sales,
            salesDeals: _count.sales_deals,
            totalRelationships: _count.projects + _count.immediate_sales + _count.sales_deals
          }
        },
        { status: 409 }
      );
    }

    // Perform the deletion
    await prisma.province_water_mappings.delete({
      where: { id: parsedId }
    });

    return NextResponse.json({
      success: true,
      message: "Province water mapping deleted successfully",
      data: { deletedId: id }
    });

  } catch (error) {
    console.error("Error deleting province water mapping:", error);

    // Handle foreign key constraint errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          {
            error: "Deletion not allowed",
            message: "Cannot delete mapping due to existing references in other records"
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to delete province water mapping. Please try again later."
      },
      { status: 500 }
    );
  }
}
