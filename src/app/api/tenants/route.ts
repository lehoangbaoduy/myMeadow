import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function getRole(clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  return user?.role ?? null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: { user: { select: { role: true } } },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getRole(userId);
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, dob, gender, roomNumber, notes, clerkId } = body;

  if (!name || !gender) {
    return NextResponse.json({ error: "name and gender are required" }, { status: 400 });
  }

  // Find or create user row
  let linkedUser = await prisma.user.findUnique({ where: { clerkId: clerkId ?? "" } });
  if (!linkedUser) {
    linkedUser = await prisma.user.create({
      data: { clerkId: clerkId ?? `manual_${Date.now()}`, role: "TENANT" },
    });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      dob: dob ? new Date(dob) : null,
      gender,
      roomNumber: roomNumber ?? null,
      notes: notes ?? null,
      userId: linkedUser.id,
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
