import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { serialize } from "cookie";
import bcrypt from "bcryptjs";
import { checkRateLimit, authRateLimiter } from "@/lib/rateLimit";
import { handleApiError, createApiResponse, createErrorResponse, AuthenticationError } from "@/lib/errorHandler";

export async function POST(request: Request) {
  try {
    console.log("Signin API called");

    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, authRateLimiter);
    if (rateLimitResult.errorResponse) {
      console.log("Rate limit exceeded");
      return rateLimitResult.errorResponse;
    }

    let body;
    try {
      body = await request.json();
      console.log("Request body received:", { email: body.email, hasPassword: !!body.password });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return createErrorResponse({
        message: "Invalid request body",
        statusCode: 400,
        code: "INVALID_REQUEST"
      });
    }

    const { email, password } = body;

    // 1. Validate user with DB
    console.log("Looking up user with email:", email);
    let user;
    try {
      // Use the existing prisma instance
      user = await prisma.users.findUnique({ where: { email } });
      console.log("User lookup result:", user ? "User found" : "User not found");
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError);
      throw new AuthenticationError("Database connection failed");
    }

    if (!user) {
      console.log("User not found, throwing authentication error");
      throw new AuthenticationError("Invalid email or password");
    }

    if (!user.verified) {
      console.log("User not verified");
      return createErrorResponse({
        message: "Email not verified. Please check your email for verification instructions.",
        statusCode: 401,
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    // 2. Verify password
    console.log("Verifying password");
    let isCurrentPasswordValid;
    try {
      isCurrentPasswordValid = await bcrypt.compare(password, user.password);
      console.log("Password verification result:", isCurrentPasswordValid);
    } catch (bcryptError) {
      console.error("Password verification error:", bcryptError);
      throw new AuthenticationError("Password verification failed");
    }

    if (!isCurrentPasswordValid) {
      console.log("Invalid password");
      throw new AuthenticationError("Invalid email or password");
    }


    // 3. Create JWT
    console.log("Creating JWT token");
    let token;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      token = await new SignJWT({ userId: user.email, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(secret);
      console.log("JWT token created successfully");
    } catch (jwtError) {
      console.error("JWT creation error:", jwtError);
      throw new AuthenticationError("Token creation failed");
    }

    // 4. Set JWT in httpOnly cookie
    console.log("Creating response with user data");
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode
      },
      timestamp: new Date().toISOString()
    });

    response.headers.set(
      "Set-Cookie",
      serialize("token", token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      })
    );

    console.log("Login successful, returning response");
    return response;
  } catch (error) {
    // console.log("here we got the error")
    const apiError = handleApiError(error, 'signin');
    return createErrorResponse(apiError);
  }
}


export async function GET() {
  // Clear cookie by setting maxAge = -1
  const response = NextResponse.json(
    { success: true, message: "Logged out" },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );

  response.headers.set(
    "Set-Cookie",
    serialize("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: -1, // expire immediately
    })
  );

  return response;
}

