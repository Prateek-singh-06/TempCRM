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
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// POST /api/pipeline - Create a new pipeline
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      opportunityId,
      companyId,
      name,
      status,
      orderValue,
      quantity,
      diameter,
      specification,
      orderDate,
      expectedDeliveryDate,
      challenges,
      notes,
      // Additional pipeline fields
      customerName,
      class: classField,
      nr,
      orderValueInCr,
      qtyInMt,
      expectedOrderBookDate,
      wonDate,
      wonReason,
      nextSteps
    } = body;

    // Validate required fields
    if (!opportunityId || !companyId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: opportunityId, companyId, name" },
        { status: 400 }
      );
    }

    // Process orderValueInCr to regular order value if provided
    let finalOrderValue = orderValue ? parseFloat(orderValue) : 0;
    if (orderValueInCr) {
      finalOrderValue = parseFloat(orderValueInCr) * 10000000; // Convert crores to dollars
    }

    // Set quantity from qtyInMt if provided
    let finalQuantity = quantity ? parseFloat(quantity) : undefined;
    if (qtyInMt) {
      finalQuantity = parseFloat(qtyInMt);
    }

    // Set expectedDeliveryDate from expectedOrderBookDate if provided
    let finalExpectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined;
    if (expectedOrderBookDate) {
      finalExpectedDeliveryDate = new Date(expectedOrderBookDate);
    }

    // Build enhanced notes with additional information
    let enhancedNotes = notes || '';
    if (wonReason || nextSteps || customerName || classField || nr) {
      enhancedNotes += '\n\n--- PIPELINE DETAILS ---\n';
      if (customerName) enhancedNotes += `Customer: ${customerName}\n`;
      if (classField) enhancedNotes += `Class: ${classField}\n`;
      if (nr) enhancedNotes += `NR: ${nr}\n`;
      if (orderValueInCr) enhancedNotes += `Order Value: $${orderValueInCr}M\n`;
      if (qtyInMt) enhancedNotes += `Quantity: ${qtyInMt} MT\n`;
      if (wonReason) enhancedNotes += `Win Reason: ${wonReason}\n`;
      if (nextSteps) enhancedNotes += `Next Steps: ${nextSteps}\n`;
      if (wonDate) enhancedNotes += `Won Date: ${wonDate}\n`;
    }

    // Check if opportunity exists and belongs to user
    const opportunity = await prisma.opportunities.findFirst({
      where: {
        id: parseInt(opportunityId),
        ...(user.role !== "admin" && { ownerId: user.id }),
      }
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Check if pipeline already exists for this opportunity
    const existingPipeline = await prisma.pipelines.findUnique({
      where: { opportunityId: parseInt(opportunityId) }
    });

    if (existingPipeline) {
      return NextResponse.json(
        { error: "Pipeline already exists for this opportunity" },
        { status: 409 }
      );
    }

    // Create the pipeline
    const pipeline = await prisma.pipelines.create({
      data: {
        opportunityId: parseInt(opportunityId),
        companyId: parseInt(companyId),
        name,
        status: status || "incoming",
        orderValue: finalOrderValue || 0,
        quantity: finalQuantity,
        diameter: diameter || classField, // Use classField as diameter if diameter not provided
        specification: specification || `${diameter || ''} ${nr || ''}`.trim(),
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDeliveryDate: finalExpectedDeliveryDate,
        challenges: challenges || "Order processing and delivery coordination",
        notes: enhancedNotes || "Pipeline created from won opportunity",
        ownerId: user.id,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline:", error);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 }
    );
  }
}

// GET /api/pipeline - Get all pipelines
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunityId');

    const whereClause: any = {
      ...(user.role !== "admin" && { ownerId: user.id }),
      ...(opportunityId && { opportunityId: parseInt(opportunityId) })
    };

    const pipelines = await prisma.pipelines.findMany({
      where: whereClause,
      include: {
        opportunities: {
          include: {
            companies: true,
            users: {
              select: { name: true, email: true }
            }
          }
        },
        companies: true,
        users: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ pipelines });
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipelines" },
      { status: 500 }
    );
  }
}
