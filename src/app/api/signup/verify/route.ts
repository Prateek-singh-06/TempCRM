import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import based on your project

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Debug log
    console.log("Incoming verification request body:", body);

    // Check if temp registration exists
    const tempRegistration = await prisma.tempRegistrations.findFirst({
      where: { email: body.email },
    });

    if (!tempRegistration) {
      return NextResponse.json(
        { error: "Registration session expired. Please start signup again." },
        { status: 400 }
      );
    }

    // Check if temp registration has expired
    if (tempRegistration.expiresAt < new Date()) {
      await prisma.tempRegistrations.deleteMany({
        where: { email: body.email },
      });
      return NextResponse.json(
        { error: "Registration session expired. Please start signup again." },
        { status: 400 }
      );
    }

    // Verify OTP
    if (tempRegistration.otp !== body.otp?.toString()) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Create the actual user account from temp registration data
    if (tempRegistration.otp === body.otp?.toString()) {
      await prisma.users.create({
        data: {
          name: tempRegistration.name,
          email: tempRegistration.email,
          employeeCode: tempRegistration.employeeCode,
          password: tempRegistration.password,
          verified: true,
        },
      });
    } else {
      return NextResponse.json({ error: "OTP verification failed" }, { status: 400 });
    }

    // Clean up temp registration
    await prisma.tempRegistrations.deleteMany({
      where: { email: body.email },
    });

    return NextResponse.json({ message: "User verified successfully." });
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in OTP verification:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
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
