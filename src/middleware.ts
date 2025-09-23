import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;
  
  // Allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/signin") ||
    pathname.startsWith("/api/signup") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/test-email") ||
    pathname.startsWith("/_next") || // Next.js assets
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // No token → redirect to login
  if (!token) {
    // console.log("No token found, redirecting to login.");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Verify JWT using jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    // Attach user info to request headers for API routes
    req.headers.set("x-user-id", decoded.userId as string);
    if (decoded.role) {
      req.headers.set("x-user-role", decoded.role as string);
    }

    return NextResponse.next();
  } catch {
    // Log error securely without sensitive details (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log("Token verification failed, redirecting to login");
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// No matcher config needed - middleware runs on all routes by default
// The pathname checking in the middleware function handles route filtering
