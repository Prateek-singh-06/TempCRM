import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          avatar: true,
          avatarThumbnail: true,
          employeeCode: true
        }
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/members - Get all members with basic info
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const role = searchParams.get("role");

    // Build where clause
    let where: Record<string, unknown> = {};

    // Role-based filtering
    if (user.role === "user") {
      // Regular users can only see themselves and others in their department
      where.OR = [
        { id: user.id },
        ...(user.department ? [{ department: user.department }] : [])
      ];
    } else if (user.role === "manager") {
      // Managers can see their department
      if (user.department) {
        where.department = user.department;
      }
    }
    // Admins can see all users (no additional filtering)

    // Search filter - apply to visible results
    if (search) {
      const searchFilter = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } }
        ]
      };

      // Combine with existing filters
      if (where.OR) {
        // For users with role-based OR, we need to apply search to the intersection
        where = {
          AND: [
            { OR: where.OR },
            searchFilter
          ]
        };
      } else {
        where = {
          ...where,
          ...searchFilter
        };
      }
    }

    // Department filter
    if (department) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ department });
      } else {
        where.department = department;
      }
    }

    // Role filter
    if (role) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ role });
      } else {
        where.role = role;
      }
    }

    const members = await prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        department: true,
        avatar: true,
        avatarThumbnail: true,
        avatarMedium: true,
        phone: true,
        location: true,
        bio: true,
        createdAt: true,
        verified: true,
        // Quick stats with error handling
        _count: {
          select: {
            activities: true,
            attendances_attendances_userIdTousers: true,
            leads: true,
            opportunities: true,
            projects_projects_ownerIdTousers: true,
            sales_deals: true,
            daily_follow_ups: true,
            pending_quotations: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // Admins first
        { name: 'asc' }
      ]
    }).catch(err => {
      console.error('Error fetching members:', err);
      return [];
    });

    // Add debugging for the first few members
    if (members.length > 0) {
      console.log('Sample member data:', {
        id: members[0].id,
        name: members[0].name,
        counts: members[0]._count
      });
    }

    // Get unique departments for filter options
    const departmentWhere: Record<string, unknown> = {};
    if (user.role === "user") {
      // Regular users can only see departments they have access to
      departmentWhere.OR = [
        { id: user.id },
        ...(user.department ? [{ department: user.department }] : [])
      ];
    } else if (user.role === "manager") {
      // Managers can see their department
      if (user.department) {
        departmentWhere.department = user.department;
      }
    }
    // Admins can see all departments

    const departments = await prisma.users.findMany({
      where: departmentWhere,
      select: { department: true },
      distinct: ['department']
    }).catch(err => {
      console.error('Error fetching departments:', err);
      return [];
    });

    const uniqueDepartments = departments
      .map(d => d.department)
      .filter(Boolean)
      .sort();

    // Ensure all members have proper _count objects
    const processedMembers = members.map(member => ({
      ...member,
      _count: {
        activities: member._count?.activities || 0,
        attendances_attendances_userIdTousers: member._count?.attendances_attendances_userIdTousers || 0,
        leads: member._count?.leads || 0,
        opportunities: member._count?.opportunities || 0,
        projects_projects_ownerIdTousers: member._count?.projects_projects_ownerIdTousers || 0,
        sales_deals: member._count?.sales_deals || 0,
        daily_follow_ups: member._count?.daily_follow_ups || 0,
        pending_quotations: member._count?.pending_quotations || 0
      }
    }));

    return NextResponse.json({
      members: processedMembers,
      departments: uniqueDepartments,
      isAdmin: user.role === "admin" || user.role === "SuperAdmin"
    });

  } catch (error: unknown) {
    console.error("Error fetching members:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch members", details: errorMessage },
      { status: 500 }
    );
  }
}
