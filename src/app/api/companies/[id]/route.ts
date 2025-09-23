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

// GET /api/companies/[id] - Get a specific company
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
    const companyId = parseInt(resolvedParams.id);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const company = await prisma.companies.findFirst({
      where: {
        id: companyId,
        ownerId: user.id
      },
      include: {
        opportunities: true,
        contacts: true,
        users: {
          select: { name: true, email: true }
        }
      }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update a company
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
    const companyId = parseInt(resolvedParams.id);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, region, type, address, website} = body;

    // Check if company exists and belongs to user
    const existingCompany = await prisma.companies.findFirst({
      where: {
        id: companyId,
        ownerId: user.id
      }
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if new name conflicts with another company
    if (name && name !== existingCompany.name) {
      const nameConflict = await prisma.companies.findUnique({
        where: { name }
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: "Company with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedCompany = await prisma.companies.update({
      where: { id: companyId },
      data: {
        ...(name && { name }),
        ...(region && { region: region }),
        ...(type && { type }),
        ...(address !== undefined && { address }),
        ...(website !== undefined && { website }),
      },
      include: {
        users: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Delete a company
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
    const companyId = parseInt(resolvedParams.id);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Check if company exists and belongs to user
    const existingCompany = await prisma.companies.findFirst({
      where: {
        id: companyId,
        ownerId: user.id
      }
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await prisma.companies.delete({
      where: { id: companyId }
    });

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
