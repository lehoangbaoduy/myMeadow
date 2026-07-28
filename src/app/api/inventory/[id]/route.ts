import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { serializeItem } from "@/lib/inventory-history";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { name: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { level } = await req.json();
  if (typeof level !== "number" || level < 0 || level > 1) {
    return NextResponse.json({ error: "level must be a number 0-1" }, { status: 400 });
  }

  const itemId = Number(params.id);
  const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { level },
  });

  if (level > existing.level) {
    await prisma.inventoryLevelLog.create({
      data: {
        itemId,
        changedByUserId: caller.id,
        changedByName: caller.tenant?.name ?? "Admin",
        previousLevel: existing.level,
        newLevel: level,
      },
    });
  }

  const lastLog = await prisma.inventoryLevelLog.findFirst({
    where: { itemId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return NextResponse.json(serializeItem(item, lastLog));
}
