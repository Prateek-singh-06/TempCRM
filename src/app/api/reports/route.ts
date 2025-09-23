import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ReportsService } from "@/lib/reports";
import { prisma } from "@/lib/prisma";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
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
        select: { id: true, role: true }
      });
      if (user) {
        return { id: user.id, role: user.role };
      }
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/reports - Generate reports
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') as 'sales' | 'quotation' | 'attendance' | 'pipeline' | 'forecast';
    const period = searchParams.get('period') as 'week' | 'month' | 'quarter' | 'year' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Allow custom date range or period
    if (!reportType) {
      return NextResponse.json({ error: "Missing report type" }, { status: 400 });
    }

    // If custom dates are provided, use them; otherwise use period
    const dateRange = startDate && endDate 
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : null;

    const reportsService = new ReportsService(user);
    let reportData;

    switch (reportType) {
      case 'sales':
        reportData = await reportsService.generateSalesReport(period || 'month');
        break;
      case 'quotation':
        reportData = await reportsService.generateQuotationReport(period || 'month');
        break;
      case 'attendance':
        reportData = await reportsService.generateAttendanceReport(period || 'month');
        break;
      case 'pipeline':
        // Generate pipeline-specific report
        reportData = await reportsService.generatePipelineReport(period || 'month');
        break;
      case 'forecast':
        // Generate forecast-specific report
        reportData = await reportsService.generateForecastReport(period || 'month');
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reportType,
      period,
      data: reportData,
      generatedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("Error generating report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to generate report", details: errorMessage },
      { status: 500 }
    );
  }
}
