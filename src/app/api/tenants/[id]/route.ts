import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function getCallerUser(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { id: true } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(params.id) },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(tenant);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await getCallerUser(userId);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = Number(params.id);
  const isAdmin = caller.role === "ADMIN";
  const isOwn = caller.tenant?.id === tenantId;

  if (!isAdmin && !isOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, dob, gender, roomNumber, notes, nickname } = body;

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
      ...(gender !== undefined && { gender }),
      ...(roomNumber !== undefined && { roomNumber }),
      ...(notes !== undefined && { notes }),
      ...(nickname !== undefined && { nickname }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await getCallerUser(userId);
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tenant.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
