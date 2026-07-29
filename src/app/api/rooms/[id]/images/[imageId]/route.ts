import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin(clerkId: string) {
  const caller = await prisma.user.findUnique({ where: { clerkId } });
  return caller?.role === "ADMIN" ? caller : null;
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; imageId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.roomImage.delete({ where: { id: Number(params.imageId) } });
  return NextResponse.json({ success: true });
}
