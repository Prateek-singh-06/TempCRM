import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Extract user information from JWT token in request
 * @param request - The incoming request object
 * @returns User object or null if authentication fails
 */
export async function getUserFromToken(request: Request): Promise<AuthenticatedUser | null> {
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
        select: {
          id: true,
          name: true,
          email: true,
          role: true
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

/**
 * Check if user has required role
 * @param user - The authenticated user
 * @param requiredRoles - Array of roles that are allowed
 * @returns boolean indicating if user has required role
 */
export function hasRole(user: AuthenticatedUser, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Check if user is admin or super admin
 * @param user - The authenticated user
 * @returns boolean indicating if user has admin privileges
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return ['SuperAdmin', 'Admin'].includes(user.role);
}

/**
 * Check if user can access another user's resources
 * @param currentUser - The authenticated user making the request
 * @param targetUserId - The ID of the user whose resources are being accessed
 * @returns boolean indicating if access is allowed
 */
export function canAccessUserResources(currentUser: AuthenticatedUser, targetUserId: number): boolean {
  // Admins can access anyone's resources
  if (isAdmin(currentUser)) {
    return true;
  }

  // Users can access their own resources
  return currentUser.id === targetUserId;
}
