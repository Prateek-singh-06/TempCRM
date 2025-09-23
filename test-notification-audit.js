const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditNotificationSystem() {
  console.log('=== NOTIFICATION SYSTEM AUDIT ===\n');

  try {
    // 1. Check notification structure
    console.log('1. Notification Structure:');
    const sampleNotification = await prisma.notifications.findFirst();
    if (sampleNotification) {
      console.log('   Sample notification structure:');
      Object.keys(sampleNotification).forEach(key => {
        console.log(`     ${key}: ${typeof sampleNotification[key]}`);
      });
    } else {
      console.log('   No notifications found in database');
    }

    // 2. Check notification counts
    console.log('\n2. Notification Counts:');
    const totalNotifications = await prisma.notifications.count();
    console.log(`   Total notifications: ${totalNotifications}`);

    const unreadNotifications = await prisma.notifications.count({
      where: { isRead: false }
    });
    console.log(`   Unread notifications: ${unreadNotifications}`);

    const readNotifications = totalNotifications - unreadNotifications;
    console.log(`   Read notifications: ${readNotifications}`);

    // 3. Check user roles and notification distribution
    console.log('\n3. User Roles and Notification Distribution:');
    const users = await prisma.users.findMany({
      select: { id: true, name: true, role: true }
    });

    console.log(`   Total users: ${users.length}`);
    
    const adminUsers = users.filter(user => user.role === 'admin' || user.role === 'SuperAdmin');
    console.log(`   Admin users: ${adminUsers.length}`);
    
    // Get notification counts per user
    for (const user of users.slice(0, 5)) { // Limit to first 5 users for brevity
      const userNotificationCount = await prisma.notifications.count({
        where: { userId: user.id }
      });
      console.log(`   User ${user.name} (${user.role}): ${userNotificationCount} notifications`);
    }

    // 4. Check if admin can see all notifications
    console.log('\n4. Admin Notification Access:');
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log(`   Testing with admin user: ${adminUser.name}`);
      
      // Check notifications for this admin
      const adminNotifications = await prisma.notifications.count({
        where: { userId: adminUser.id }
      });
      console.log(`   Admin's own notifications: ${adminNotifications}`);
      
      // This would be how an admin might see all notifications
      // Currently, the system does not support this - each user only sees their own
    }

    // 5. Check recent activity
    console.log('\n5. Recent Activity:');
    const recentNotifications = await prisma.notifications.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        users_notifications_senderIdTousers: {
          select: { name: true, email: true }
        }
      }
    });

    console.log('   5 most recent notifications:');
    recentNotifications.forEach(notification => {
      console.log(`     [${new Date(notification.createdAt).toISOString()}] ${notification.title} - ${notification.message}`);
      if (notification.users_notifications_senderIdTousers) {
        console.log(`       From: ${notification.users_notifications_senderIdTousers.name}`);
      }
    });

    // 6. Check notification types
    console.log('\n6. Notification Types:');
    const notificationTypes = await prisma.notifications.groupBy({
      by: ['type'],
      _count: true
    });
    
    notificationTypes.forEach(type => {
      console.log(`   Type "${type.type}": ${type._count} notifications`);
    });

    console.log('\n=== AUDIT COMPLETE ===');

  } catch (error) {
    console.error('Error during audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditNotificationSystem();