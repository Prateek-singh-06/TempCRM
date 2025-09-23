import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      // Fetch real user data from database
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          role: true,
          verified: true,
          createdAt: true,
          avatar: true,
          avatarThumbnail: true,
          avatarMedium: true,
          avatarLarge: true,
          avatarFileName: true,
          avatarFileSize: true,
          avatarMimeType: true,
          avatarUploadedAt: true,
          _count: {
            select: {
              leads: true,
              opportunities: true,
              attendances_attendances_userIdTousers: true,
            },
          },
        },
      });

      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/profile - Get user profile data
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    // If viewing another user's profile
    let targetUser = user;
    if (targetUserId && parseInt(targetUserId) !== user.id) {
      // Only admins can view other users' profiles
      if (user.role !== "admin" && user.role !== "SuperAdmin") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const requestedUser = await prisma.users.findUnique({
        where: { id: parseInt(targetUserId) },
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          role: true,
          verified: true,
          createdAt: true,
          avatar: true,
          avatarThumbnail: true,
          avatarMedium: true,
          avatarLarge: true,
          avatarFileName: true,
          avatarFileSize: true,
          avatarMimeType: true,
          avatarUploadedAt: true,
          _count: {
            select: {
              leads: true,
              opportunities: true,
              attendances_attendances_userIdTousers: true,
            },
          },
        },
      });

      if (!requestedUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      targetUser = requestedUser;
    }

    // Calculate profile completeness based on available data
    let profileCompleteness = 40; // Base score for having account
    if (targetUser.name && targetUser.name !== "John Doe")
      profileCompleteness += 20;
    if (targetUser.employeeCode) profileCompleteness += 15;
    if (targetUser.verified) profileCompleteness += 25;

    const profileData = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      employeeCode: targetUser.employeeCode,
      role: targetUser.role,
      phone: null, // Will be added when user profile table is extended
      location: null,
      bio: null,
      avatar: targetUser.avatar || null,
      avatarThumbnail: targetUser.avatarThumbnail || null,
      avatarMedium: targetUser.avatarMedium || null,
      avatarLarge: targetUser.avatarLarge || null,
      avatarFileName: targetUser.avatarFileName || null,
      avatarFileSize: targetUser.avatarFileSize || null,
      avatarMimeType: targetUser.avatarMimeType || null,
      avatarUploadedAt: targetUser.avatarUploadedAt?.toISOString() || null,
      joinDate: targetUser.createdAt.toISOString(),
      lastLogin: new Date().toISOString(),
      department: targetUser.role === "admin" ? "Management" : "Sales",
      manager: targetUser.role === "admin" ? "CEO" : "Sales Manager",
      verified: targetUser.verified,
      twoFactorEnabled: false, // Will be implemented later
      profileCompleteness: Math.min(profileCompleteness, 100),
      stats: {
        totalLeads: targetUser._count.leads,
        totalOpportunities: targetUser._count.opportunities,
        totalAttendances: targetUser._count.attendances_attendances_userIdTousers,
        attendanceRate:
          targetUser._count.attendances_attendances_userIdTousers > 0
            ? Math.min(
                Math.round((targetUser._count.attendances_attendances_userIdTousers / 30) * 100),
                100
              )
            : 0,
      },
      privacySettings: {
        profileVisibility: "team",
        showEmail: false,
        showPhone: true,
        showLocation: true,
        allowMessages: true,
        showActivity: true,
      },
      // Admin override flag - indicates if current user is viewing someone else's profile
      isAdminView:
        targetUserId &&
        parseInt(targetUserId) !== user.id &&
        (user.role === "admin" || user.role === "SuperAdmin"),
    };

    return NextResponse.json({ profile: profileData });
  } catch (error: unknown) {
    console.error("Error fetching profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch profile", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, location, bio, department, privacySettings } =
      await request.json();

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Update user in database
    const updatedUser = await prisma.users.update({
      where: { email: user.email },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        location: location?.trim() || null,
        bio: bio?.trim() || null,
        department: department?.trim(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        verified: true,
        createdAt: true,
        avatar: true,
        avatarThumbnail: true,
        avatarMedium: true,
        avatarLarge: true,
        avatarFileName: true,
        avatarFileSize: true,
        avatarMimeType: true,
        avatarUploadedAt: true,
        _count: {
          select: {
            leads: true,
            opportunities: true,
            attendances_attendances_userIdTousers: true,
          },
        },
      },
    });

    // Calculate profile completeness
    let profileCompleteness = 40;
    if (updatedUser.name && updatedUser.name !== "John Doe")
      profileCompleteness += 20;
    if (updatedUser.employeeCode) profileCompleteness += 15;
    if (updatedUser.verified) profileCompleteness += 25;

    const updatedProfile = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      employeeCode: updatedUser.employeeCode,
      role: updatedUser.role,
      phone: phone?.trim() || null,
      location: location?.trim() || null,
      bio: bio?.trim() || null,
      department:
        department?.trim() || (user.role === "admin" ? "Management" : "Sales"),
      avatar: updatedUser.avatar || null,
      avatarThumbnail: updatedUser.avatarThumbnail || null,
      avatarMedium: updatedUser.avatarMedium || null,
      avatarLarge: updatedUser.avatarLarge || null,
      avatarFileName: updatedUser.avatarFileName || null,
      avatarFileSize: updatedUser.avatarFileSize || null,
      avatarMimeType: updatedUser.avatarMimeType || null,
      avatarUploadedAt: updatedUser.avatarUploadedAt?.toISOString() || null,
      joinDate: updatedUser.createdAt.toISOString(),
      lastLogin: new Date().toISOString(),
      manager: user.role === "admin" ? "CEO" : "Sales Manager",
      verified: updatedUser.verified,
      twoFactorEnabled: false,
      profileCompleteness: Math.min(profileCompleteness, 100),
      privacySettings: privacySettings || {
        profileVisibility: "team",
        showEmail: false,
        showPhone: true,
        showLocation: true,
        allowMessages: true,
        showActivity: true,
      },
    };
    console.log("Updated profile:", updatedProfile);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: "Profile updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update profile", details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update password
export async function PATCH(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Fetch user with password to verify current password
    const userWithPassword = await prisma.users.findUnique({
      where: { email: user.email },
      select: { password: true },
    });

    if (!userWithPassword) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      userWithPassword.password
    );
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating password:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update password", details: errorMessage },
      { status: 500 }
    );
  }
}
