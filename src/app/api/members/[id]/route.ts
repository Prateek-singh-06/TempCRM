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
          department: true
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

// GET /api/members/[id] - Get detailed member information
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: any = null;
  let memberId = 0;

  try {
    user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    memberId = parseInt(resolvedParams.id);
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
    }

    // Check permissions
    const isAdmin = user.role === "admin" || user.role === "SuperAdmin";
    const isManager = user.role === "manager";

    // If not admin/manager, can only view own profile or same department
    if (!isAdmin && !isManager && user.id !== memberId) {
      const targetUser = await prisma.users.findUnique({
        where: { id: memberId },
        select: { department: true }
      });

      if (!targetUser || targetUser.department !== user.department) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Fetch member details with comprehensive data
    console.log('Fetching member details for ID:', memberId);
    const member = await prisma.users.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        department: true,
        phone: true,
        location: true,
        bio: true,
        avatar: true,
        avatarThumbnail: true,
        avatarMedium: true,
        avatarLarge: true,
        avatarFileName: true,
        avatarFileSize: true,
        avatarMimeType: true,
        avatarUploadedAt: true,
        createdAt: true,
        verified: true,
        enableNotifications: true,
        // Comprehensive stats counts
        _count: {
          select: {
            activities: true,
            attendances_attendances_userIdTousers: true,
            leads: true,
            opportunities: true,
            projects_projects_ownerIdTousers: true,
            sales_deals: true,
            daily_follow_ups: true,
            pending_quotations: true,
            immediate_sales: true,
            attendances_attendances_reviewerIdTousers: true
          }
        }
      }
    }).catch(err => {
      console.error('Error fetching member details:', err);
      return null;
    });

    console.log('Member found:', member ? 'Yes' : 'No');
    if (member) {
      console.log('Member details:', { id: member.id, name: member.name, role: member.role });
    }

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Ensure member has proper _count structure
    const processedMember = {
      ...member,
      _count: {
        activities: member._count?.activities || 0,
        attendances_attendances_userIdTousers: member._count?.attendances_attendances_userIdTousers || 0,
        leads: member._count?.leads || 0,
        opportunities: member._count?.opportunities || 0,
        projects_projects_ownerIdTousers: member._count?.projects_projects_ownerIdTousers || 0,
        sales_deals: member._count?.sales_deals || 0,
        daily_follow_ups: member._count?.daily_follow_ups || 0,
        pending_quotations: member._count?.pending_quotations || 0,
        immediate_sales: member._count?.immediate_sales || 0,
        attendances_attendances_reviewerIdTousers: member._count?.attendances_attendances_reviewerIdTousers || 0
      }
    };

    // Fetch recent attendance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch work history (all activities, paginated)
    const workHistory = await prisma.activities.findMany({
      where: { userId: memberId },
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            status: true,
            companyId: true,
            companies: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: 50
    });

    // Fetch daily follow-ups created by the user
    const createdFollowUps = await prisma.daily_follow_ups.findMany({
      where: {
        createdById: memberId
      },
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        sales_deals: {
          select: {
            id: true,
            name: true,
            currentStatus: true
          }
        },
        immediate_sales: {
          select: {
            id: true,
            contractor: true,
            status: true,
            valueOfOrder: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Fetch active assigned tasks (follow-ups assigned to this user)
    const assignedTasks = await prisma.daily_follow_ups.findMany({
      where: {
        assignedTo: member.email,
        status: {
          in: ['SCHEDULED', 'POSTPONED']
        }
      },
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        sales_deals: {
          select: {
            id: true,
            name: true,
            currentStatus: true
          }
        },
        immediate_sales: {
          select: {
            id: true,
            contractor: true,
            status: true,
            valueOfOrder: true
          }
        }
      },
      orderBy: { followUpDate: 'asc' },
      take: 10
    });

    // Fetch recent attendance (last 30 days)
    const recentAttendance = await prisma.attendances.findMany({
      where: {
        userId: memberId,
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { date: 'desc' },
      include: {
        users_attendances_reviewerIdTousers: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Fetch today's work (activities from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayActivities = await prisma.activities.findMany({
      where: {
        userId: memberId,
        occurredAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        leads: {
          select: {
            id: true,
            name: true,
            status: true,
            companyId: true,
            companies: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { occurredAt: 'desc' }
    });

    // Fetch today's attendance
    const todayAttendance = await prisma.attendances.findFirst({
      where: {
        userId: memberId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        users_attendances_reviewerIdTousers: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Fetch leads created by the user
    const userLeadsData = await prisma.leads.findMany({
      where: {
        ownerId: memberId
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        status: true,
        source: true,
        email: true,
        phone: true,
        createdDate: true,
        companies: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            activities: true,
            daily_follow_ups: true
          }
        }
      },
      orderBy: { createdDate: 'desc' },
      take: 20
    });

    // Calculate opportunities count for each lead
    const userLeads = await Promise.all(
      userLeadsData.map(async (lead) => {
        const opportunitiesCount = await prisma.opportunities.count({
          where: { leadId: lead.id }
        });
        return {
          ...lead,
          _count: {
            ...lead._count,
            opportunities: opportunitiesCount
          }
        };
      })
    );

    // Fetch opportunities managed by the user (pipeline data)
    const userOpportunities = await prisma.opportunities.findMany({
      where: {
        ownerId: memberId
      },
      select: {
        id: true,
        name: true,
        stage: true,
        dealSize: true,
        probability: true,
        expectedCloseDate: true,
        createdDate: true,
        leadId: true,
        companies: {
          select: {
            id: true,
            name: true,
            region: true
          }
        }
      },
      orderBy: { createdDate: 'desc' },
      take: 20
    });

    // Fetch projects created by the user
    const userProjects = await prisma.projects.findMany({
      where: {
        ownerId: memberId
      },
      select: {
        id: true,
        name: true,
        province: true,
        status: true,
        sizeClass: true,
        approxMT: true,
        projectHealth: true,
        createdAt: true,
        _count: {
          select: {
            daily_follow_ups: true,
            sales_deals: true,
            pending_quotations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    // Fetch sales deals created by the user
    const userSalesDeals = await prisma.sales_deals.findMany({
      where: {
        ownerId: memberId
      },
      select: {
        id: true,
        name: true,
        currentStatus: true,
        orderValue: true,
        expectedCloseDate: true,
        contractor: true,
        province: true,
        createdAt: true,
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    // Fetch immediate sales created by the user
    const userImmediateSales = await prisma.immediate_sales.findMany({
      where: {
        ownerId: memberId
      },
      select: {
        id: true,
        contractor: true,
        sizeClass: true,
        valueOfOrder: true,
        status: true,
        quotationDate: true,
        createdAt: true,
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    // Fetch pending quotations created by the user
    const userPendingQuotations = await prisma.pending_quotations.findMany({
      where: {
        createdById: memberId
      },
      select: {
        id: true,
        projectOrClientName: true,
        orderValue: true,
        status: true,
        quotationDeadline: true,
        urgencyLevel: true,
        createdAt: true,
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate performance metrics
    const totalActivities = await prisma.activities.count({
      where: { userId: memberId }
    }).catch(err => {
      console.error('Error counting activities:', err);
      return 0;
    });

    // Try to count completed tasks by email first, then fallback to user ID if needed
    let completedTasks = await prisma.daily_follow_ups.count({
      where: {
        assignedTo: member.email,
        status: 'COMPLETED'
      }
    }).catch(err => {
      console.error('Error counting completed tasks by email:', err);
      return 0;
    });

    // If no tasks found by email, try by user ID (in case assignedTo stores ID instead of email)
    if (completedTasks === 0) {
      completedTasks = await prisma.daily_follow_ups.count({
        where: {
          assignedTo: memberId.toString(),
          status: 'COMPLETED'
        }
      }).catch(err => {
        console.error('Error counting completed tasks by ID:', err);
        return 0;
      });
    }

    // Calculate attendance rate - approved attendances / total working days (last 30 days)
    const thirtyDaysAgoForAttendance = new Date();
    thirtyDaysAgoForAttendance.setDate(thirtyDaysAgoForAttendance.getDate() - 30);

    // Calculate actual working days (excluding weekends)
    let workingDays = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgoForAttendance);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
    }

    const approvedAttendances = await prisma.attendances.count({
      where: {
        userId: memberId,
        date: {
          gte: thirtyDaysAgoForAttendance
        },
        status: 'APPROVED'
      }
    }).catch(err => {
      console.error('Error counting approved attendances:', err);
      return 0;
    });

    const attendanceRate = workingDays > 0 ? Math.round((approvedAttendances / workingDays) * 100) : 0;


    // Additional counts
    const totalLeads = await prisma.leads.count({
      where: { ownerId: memberId }
    }).catch(err => {
      console.error('Error counting leads:', err);
      return 0;
    });

    const totalOpportunities = await prisma.opportunities.count({
      where: { ownerId: memberId }
    }).catch(err => {
      console.error('Error counting opportunities:', err);
      return 0;
    });

    const totalProjects = await prisma.projects.count({
      where: { ownerId: memberId }
    }).catch(err => {
      console.error('Error counting projects:', err);
      return 0;
    });

    const totalSalesDeals = await prisma.sales_deals.count({
      where: { ownerId: memberId }
    }).catch(err => {
      console.error('Error counting sales deals:', err);
      return 0;
    });

    const totalImmediateSales = await prisma.immediate_sales.count({
      where: { ownerId: memberId }
    }).catch(err => {
      console.error('Error counting immediate sales:', err);
      return 0;
    });

    const totalCreatedFollowUps = await prisma.daily_follow_ups.count({
      where: { createdById: memberId }
    }).catch(err => {
      console.error('Error counting created follow-ups:', err);
      return 0;
    });

    // Debug logging for performance metrics
    console.log('Performance metrics for user', memberId, ':', {
      totalActivities,
      completedTasks,
      approvedAttendances,
      workingDays,
      attendanceRate,
      totalLeads,
      totalOpportunities,
      totalProjects,
      totalSalesDeals,
      totalImmediateSales,
      totalCreatedFollowUps,
      pendingQuotations: processedMember._count.pending_quotations
    });

    const performanceMetrics = {
      totalActivities,
      completedTasks,
      attendanceRate: Math.round(attendanceRate),
      activeProjects: totalProjects,
      activeOpportunities: totalOpportunities,
      totalLeads,
      pendingQuotations: processedMember._count.pending_quotations,
      totalSalesDeals,
      totalImmediateSales,
      totalCreatedFollowUps
    };

    // Debug: Log final performance metrics before response
    console.log('Final performance metrics response for user', memberId, ':', performanceMetrics);

    return NextResponse.json({
      member: processedMember,
      workToday: {
        activities: todayActivities,
        attendance: todayAttendance
      },
      workHistory: workHistory,
      createdFollowUps: createdFollowUps,
      assignedTasks: assignedTasks,
      recentAttendance: recentAttendance,
      userLeads: userLeads,
      userOpportunities: userOpportunities,
      userProjects: userProjects,
      userSalesDeals: userSalesDeals,
      userImmediateSales: userImmediateSales,
      userPendingQuotations: userPendingQuotations,
      performanceMetrics: performanceMetrics,
      isAdminView: isAdmin || isManager
    });

  } catch (error: unknown) {
    console.error("Error fetching member details:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");

    // Log additional debugging info
    console.error("Member ID being fetched:", memberId);
    console.error("User making request:", user ? { id: user?.id, role: user?.role } : "No user");

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Final error message:", errorMessage);

    return NextResponse.json(
      { error: "Failed to fetch member details", details: errorMessage },
      { status: 500 }
    );
  }
}
