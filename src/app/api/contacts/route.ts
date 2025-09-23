import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const { name, role, email, phone, companyId } = body;
        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }
        if(!companyId){
            return NextResponse.json({ error: "Please select the company" }, { status: 400 });
        }
        const newContact = await prisma.contacts.create({
            data: {
                name,
                role,
                email,
                phone,
                companyId
            }
        });
        return NextResponse.json({ contact: newContact }, { status: 201 });
    } catch (error) {
        console.error("Error creating contact:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}