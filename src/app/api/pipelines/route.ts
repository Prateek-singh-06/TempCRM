import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
        select: { id: true, name: true, email: true, role: true }
      });
      return user;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function extractFromNotes(notes?: string, key?: string): string | null {
  if (!notes || !key) return null;
  const regex = new RegExp(`${key}[:\s]+([^|\n]+)`, 'i');
  const match = notes.match(regex);
  return match ? match[1].trim() : null;
}

// GET /api/pipelines - List pipeline records with owner and company
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin' || user.role === 'SuperAdmin';

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    const where: any = {};
    if (!isAdmin) where.ownerId = user.id;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companies: { name: { contains: search, mode: 'insensitive' } } as any }
      ];
    }

    const [pipelines, total] = await Promise.all([
      prisma.pipelines.findMany({
        where,
        include: {
          users: { select: { id: true, name: true, email: true } },
          companies: { select: { id: true, name: true } }
        },
        orderBy: { orderDate: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.pipelines.count({ where })
    ]);

    // Map to requested columns plus raw
    const rows = pipelines.map(p => ({
      id: p.id,
      opportunityId: p.opportunityId,
      companyId: p.companyId,
      customerName: p.companies?.name || null,
      class: (p as any).classLabel || extractFromNotes(p.notes || undefined, 'Class'),
      diameter: p.diameter,
      nr: (p as any).nrLabel || extractFromNotes(p.notes || undefined, 'NR'),
      orderValueCr: p.orderValue ? p.orderValue / 10000000 : 0,
      qtyInMt: p.quantity,
      specification: p.specification,
      challenges: p.challenges,
      expectedOrderDate: p.expectedDeliveryDate || p.orderDate,
      owner: p.users ? { id: p.users.id, name: p.users.name, email: p.users.email } : null,
      status: p.status,
      name: p.name,
      orderDate: p.orderDate,
      updatedAt: p.updatedAt
    }));

    return NextResponse.json({
      pipelines: rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
  }
}

