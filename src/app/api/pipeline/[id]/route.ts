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

// DELETE /api/pipeline/[id] - Delete a pipeline (for cleanup on failed opportunity updates)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const pipelineId = parseInt(resolvedParams.id);
    if (isNaN(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline ID" }, { status: 400 });
    }

    // Check if pipeline exists and belongs to user
    const pipeline = await prisma.pipelines.findFirst({
      where: {
        id: pipelineId,
        ...(user.role !== "admin" && { ownerId: user.id }),
      }
    });

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Delete the pipeline
    await prisma.pipelines.delete({
      where: { id: pipelineId }
    });

    return NextResponse.json({ message: "Pipeline deleted successfully" });
  } catch (error) {
    console.error("Error deleting pipeline:", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 }
    );
  }
}
