import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    // First try to get user info from headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (userId && userRole) {
      // Fetch user from database to ensure they exist
      const user = await prisma.users.findUnique({
        where: { email: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true
        }
      });

      if (!user) {
        console.error("User not found in database:", userId);
        return null;
      }

      return {
        id: user.id.toString(),
        name: user.name,
        role: user.role,
        employeeCode: user.employeeCode
      };
    }

    // Fallback to manual JWT verification if headers not available
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      console.error("No token found in cookies");
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) {
      console.error("No userId in JWT payload");
      return null;
    }

    // Fetch user from database to ensure they exist
    const user = await prisma.users.findUnique({
      where: { email: payload.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeCode: true
      }
    });

    if (!user) {
      console.error("User not found in database:", payload.userId);
      return null;
    }

    return {
      id: user.id.toString(),
      name: user.name,
      role: user.role,
      employeeCode: user.employeeCode
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/projects - List all projects
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

    // Build where clause for Prisma query
    const whereClause: any = {};

    // For non-admin users, only show their own projects
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      whereClause.ownerId = parseInt(user.id);
    }

    // Apply filters
    if (status) {
      whereClause.status = status;
    }
    if (province) {
      whereClause.province = province;
    }
    if (ownerId) {
      // Only allow filtering by ownerId for admins
      if (user.role === 'admin' || user.role === 'SuperAdmin') {
        whereClause.ownerId = parseInt(ownerId);
      }
    }

    const projects = await prisma.projects.findMany({
      where: whereClause,
      include: {
        users_projects_ownerIdTousers: {
          select: { name: true, email: true, employeeCode: true }
        },
        users_projects_assignedAdminIdTousers: {
          select: { name: true, email: true, employeeCode: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ projects });
  } catch (error: unknown) {
    console.error("Error fetching projects:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch projects", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      province,
      funding,
      consultant,
      contractor,
      competitors,
      sizeClass,
      unitOfMeasurement,
      approxMT,
      status = "ONGOING",
      monthOfQuote,
      dateOfStartProcurement,
      pic,
      assignedAdminId
    } = body;

    // Validate required fields
    if (!name || !province) {
      return NextResponse.json({ error: "Name and province are required" }, { status: 400 });
    }

    const project = await prisma.projects.create({
      data: {
        name,
        province,
        ownerId: parseInt(user.id),
        funding,
        consultant,
        contractor,
        competitors,
        sizeClass,
        unitOfMeasurement,
        approxMT,
        status,
        monthOfQuote,
        dateOfStartProcurement: dateOfStartProcurement ? new Date(dateOfStartProcurement) : null,
        pic,
        assignedAdminId: assignedAdminId ? parseInt(assignedAdminId) : null,
        updatedAt: new Date()
      },
      include: {
        users_projects_ownerIdTousers: {
          select: { name: true, email: true, employeeCode: true }
        },
        users_projects_assignedAdminIdTousers: {
          select: { name: true, email: true, employeeCode: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      project,
      message: "Project created successfully"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error creating project:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create project", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/projects - Update a project
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Check if user has permission to update this project
    const project = await prisma.projects.findUnique({
      where: { id: parseInt(id) }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only allow admins or project owners to update
    if (user.role !== 'admin' && user.role !== 'SuperAdmin' && project.ownerId !== parseInt(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.projects.update({
      where: { id: parseInt(id) },
      data: updates
    });

    return NextResponse.json({
      success: true,
      message: "Project updated successfully"
    });

  } catch (error: unknown) {
    console.error("Error updating project:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update project", details: errorMessage },
      { status: 500 }
    );
  }
}
