import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryRunOut.findMany({
    where: { resolved: false },
    orderBy: { reportedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemName } = await req.json();
  if (!itemName) return NextResponse.json({ error: "itemName is required" }, { status: 400 });

  // Avoid duplicate entries
  const existing = await prisma.inventoryRunOut.findFirst({
    where: { itemName, resolved: false },
  });
  if (existing) return NextResponse.json(existing);

  const entry = await prisma.inventoryRunOut.create({ data: { itemName } });

  // Also notify all users
  const users = await prisma.user.findMany({ select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      fromName: "Kitchen Inventory",
      content: `🚨 "${itemName}" is running out! Please pick some up soon.`,
    })),
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { name: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const runOutEntry = await prisma.inventoryRunOut.findUnique({ where: { id: Number(id) } });
  if (!runOutEntry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolving means the item has been restocked — reset it to full and log
  // the restock, same as any other level increase.
  const item = await prisma.inventoryItem.findUnique({ where: { name: runOutEntry.itemName } });
  if (item && item.level < 1) {
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { level: 1 } });
    await prisma.inventoryLevelLog.create({
      data: {
        itemId: item.id,
        changedByUserId: caller.id,
        changedByName: caller.tenant?.name ?? "Admin",
        previousLevel: item.level,
        newLevel: 1,
      },
    });
  }

  const updated = await prisma.inventoryRunOut.update({
    where: { id: Number(id) },
    data: { resolved: true },
  });
  return NextResponse.json(updated);
}
