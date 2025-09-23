import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
        select: { id: true, name: true, email: true, role: true },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/companies/all - Get all companies for the authenticated user
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    // Perform search only if query is provided
    const companies = await prisma.companies.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive", // case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        region: true,
      },
      orderBy: { createdDate: "desc" },
      take: 5, // Limit to 5 results for fast and efficient searching
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
