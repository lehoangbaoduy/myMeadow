import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { LevelLogEntry } from "@/lib/inventory";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.inventoryLevelLog.findMany({
    where: { itemId: Number(params.id) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const entries: LevelLogEntry[] = logs.map((log) => ({
    id: log.id,
    changedByName: log.changedByName,
    previousLevel: log.previousLevel,
    newLevel: log.newLevel,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json(entries);
}
