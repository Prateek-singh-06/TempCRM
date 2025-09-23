import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import based on your project
import { otpTemplate } from "./email.template";
import { emailService } from "@/lib/emailService";
import bcrypt from "bcryptjs";
import { checkRateLimit, authRateLimiter } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, authRateLimiter);
    if (rateLimitResult.errorResponse) {
      return rateLimitResult.errorResponse;
    }

    const body = await request.json();
    if (!body?.email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Debug log (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log("Signup attempt for:", body.email);
    }

    // Check if user already exists
    const existingUser = await (prisma as any).users.findFirst({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 400 }
      );
    }

    // Check if there's already a pending OTP for this email
    const existingOtp = await prisma.tempRegistrations.findFirst({
      where: { email: body.email },
    });

    if (existingOtp && existingOtp.expiresAt > new Date()) {
      return NextResponse.json(
        { error: "OTP already sent to this email. Please check your inbox or try again later." },
        { status: 429 }
      );
    }

    // Clean up expired OTPs for this email
    await prisma.tempRegistrations.deleteMany({
      where: {
        email: body.email,
        expiresAt: { lt: new Date() }
      },
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    // Store signup data temporarily (hash sensitive data)
    const hashedPassword = await bcrypt.hash(body.password, 12);

    await (prisma as any).tempRegistrations.create({
      data: {
        email: body.email,
        name: body.name,
        employeeCode: body.employeeCode,
        password: hashedPassword,
        otp: otp, // Store hashed OTP for security (optional but recommended)
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins for temp data
      },
    });

    // Send OTP email via centralized email service
    await emailService.sendEmail({
      to: body.email,
      subject: "Verify your email",
      html: otpTemplate(parseInt(otp))
    });

    return NextResponse.json({ message: "OTP sent to email." });
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in signup:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Something went wrong. Please try again later.",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
