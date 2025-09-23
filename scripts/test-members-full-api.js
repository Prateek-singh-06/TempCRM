const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMembersFullAPI() {
  try {
    console.log('🔍 Testing full members API queries...');

    // Get a sample user ID to test with
    const firstUser = await prisma.users.findFirst({
      select: { id: true, name: true, email: true }
    });

    if (!firstUser) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`📝 Testing with user: ${firstUser.name} (ID: ${firstUser.id})`);

    const memberId = firstUser.id;

    // Test all the queries from the API in order
    try {
      // Fetch member details
      console.log('1️⃣ Testing member details query...');
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
              companies: true
            }
          }
        }
      });

      if (!member) {
        console.log('❌ Member not found');
        return;
      }

      console.log('✅ Member details query successful');

      // Fetch recent attendance (last 30 days)
      console.log('2️⃣ Testing recent attendance query...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

      console.log('✅ Recent attendance query successful');

      // Fetch work history (all activities, paginated)
      console.log('3️⃣ Testing work history query...');
      const workHistory = await prisma.activities.findMany({
        where: { userId: memberId },
        include: {
          leads: {
            select: {
              id: true,
              name: true,
              status: true,
              companyId: true,
              companies: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { occurredAt: 'desc' },
        take: 50
      });

      console.log('✅ Work history query successful');

      // Fetch daily follow-ups created by the user
      console.log('4️⃣ Testing created follow-ups query...');
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

      console.log('✅ Created follow-ups query successful');

      // Fetch active assigned tasks (follow-ups assigned to this user)
      console.log('5️⃣ Testing assigned tasks query...');
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

      console.log('✅ Assigned tasks query successful');

      // Fetch today's work (activities from today)
      console.log('6️⃣ Testing today activities query...');
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
              companies: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { occurredAt: 'desc' }
      });

      console.log('✅ Today activities query successful');

      // Fetch today's attendance
      console.log('7️⃣ Testing today attendance query...');
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

      console.log('✅ Today attendance query successful');

      // Fetch leads created by the user
      console.log('8️⃣ Testing user leads query...');
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
          companies: { select: { id: true, name: true } },
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

      console.log('✅ User leads query successful');

      // Fetch opportunities managed by the user (pipeline data)
      console.log('9️⃣ Testing user opportunities query...');
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

      console.log('✅ User opportunities query successful');

      // Fetch projects created by the user
      console.log('🔟 Testing user projects query...');
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

      console.log('✅ User projects query successful');

      // Fetch sales deals created by the user
      console.log('1️⃣1️⃣ Testing user sales deals query...');
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

      console.log('✅ User sales deals query successful');

      // Fetch immediate sales created by the user
      console.log('1️⃣2️⃣ Testing user immediate sales query...');
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

      console.log('✅ User immediate sales query successful');

      // Fetch pending quotations created by the user
      console.log('1️⃣3️⃣ Testing user pending quotations query...');
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

      console.log('✅ User pending quotations query successful');

      // Calculate performance metrics
      console.log('1️⃣4️⃣ Testing performance metrics calculations...');
      const totalActivities = await prisma.activities.count({
        where: { userId: memberId }
      });

      const completedTasks = await prisma.daily_follow_ups.count({
        where: {
          assignedTo: member.email,
          status: 'COMPLETED'
        }
      });

      const attendanceRate = member._count.attendances_attendances_userIdTousers > 0
        ? (recentAttendance.filter(a => a.status === 'APPROVED').length / member._count.attendances_attendances_userIdTousers) * 100
        : 0;

      const totalLeads = await prisma.leads.count({
        where: { ownerId: memberId }
      });

      const totalOpportunities = await prisma.opportunities.count({
        where: { ownerId: memberId }
      });

      const totalProjects = await prisma.projects.count({
        where: { ownerId: memberId }
      });

      const totalSalesDeals = await prisma.sales_deals.count({
        where: { ownerId: memberId }
      });

      const totalImmediateSales = await prisma.immediate_sales.count({
        where: { ownerId: memberId }
      });

      const totalCreatedFollowUps = await prisma.daily_follow_ups.count({
        where: { createdById: memberId }
      });

      console.log('✅ Performance metrics calculation successful');

      // All queries passed
      console.log('🎉 All queries completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Total Activities: ${totalActivities}`);
      console.log(`   - Completed Tasks: ${completedTasks}`);
      console.log(`   - Total Leads: ${totalLeads}`);
      console.log(`   - Total Opportunities: ${totalOpportunities}`);
      console.log(`   - Total Projects: ${totalProjects}`);

    } catch (error) {
      console.error('❌ Query failed:', error.message);
      console.error('Stack trace:', error.stack);
    }

  } catch (error) {
    console.error('❌ Error testing members API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMembersFullAPI();
