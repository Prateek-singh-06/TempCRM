import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

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

export async function PUT(request: Request,
  { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getUserFromToken(request);
      if (!user) {
        return new Response("Unauthorized", { status: 401 });
      }

      const resolvedParams = await params;
      const contactId = parseInt(resolvedParams.id);
      const { name, email, phone, role } = await request.json();

      const contact = await prisma.contacts.update({
        where: { id: contactId },
        data: { name, email, phone, role },
      });

      return new Response(JSON.stringify(contact), { status: 200 });
    } catch (error) {
      console.error("Error updating contact:", error);
      return new Response("Failed to update contact", { status: 500 });
    }
  }
