const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMembersAPI() {
  try {
    console.log('🔍 Testing members API queries...');

    // Get a sample user ID to test with
    const firstUser = await prisma.users.findFirst({
      select: { id: true, name: true, email: true }
    });

    if (!firstUser) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`📝 Testing with user: ${firstUser.name} (ID: ${firstUser.id})`);

    // Test the main member query
    try {
      const member = await prisma.users.findUnique({
        where: { id: firstUser.id },
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

      console.log('✅ Member query successful');
      console.log('📊 Member counts:', member._count);
    } catch (error) {
      console.error('❌ Member query failed:', error.message);
      console.error('Stack trace:', error.stack);
    }

    // Test daily follow-ups query
    try {
      const createdFollowUps = await prisma.daily_follow_ups.findMany({
        where: {
          createdById: firstUser.id
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
        take: 5
      });

      console.log('✅ Created follow-ups query successful');
      console.log(`📊 Found ${createdFollowUps.length} follow-ups`);
    } catch (error) {
      console.error('❌ Created follow-ups query failed:', error.message);
      console.error('Stack trace:', error.stack);
    }

    // Test assigned tasks query
    try {
      const assignedTasks = await prisma.daily_follow_ups.findMany({
        where: {
          assignedTo: firstUser.email,
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
        take: 5
      });

      console.log('✅ Assigned tasks query successful');
      console.log(`📊 Found ${assignedTasks.length} assigned tasks`);
    } catch (error) {
      console.error('❌ Assigned tasks query failed:', error.message);
      console.error('Stack trace:', error.stack);
    }

  } catch (error) {
    console.error('❌ Error testing members API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMembersAPI();
