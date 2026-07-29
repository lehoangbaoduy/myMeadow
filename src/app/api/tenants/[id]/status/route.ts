import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (boolean) required" }, { status: 400 });
  }

  let deactivatedAt: Date | null = null;
  if (!body.isActive) {
    const parsedDate = body.deactivatedAt ? new Date(body.deactivatedAt) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "deactivatedAt (date) is required when deactivating a resident" }, { status: 400 });
    }
    deactivatedAt = parsedDate;
  }

  const updated = await prisma.tenant.update({
    where: { id: Number(params.id) },
    data: { isActive: body.isActive, deactivatedAt },
  });

  return NextResponse.json(updated);
}
