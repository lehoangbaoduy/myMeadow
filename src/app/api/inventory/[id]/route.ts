import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { level } = await req.json();
  if (typeof level !== "number" || level < 0 || level > 1) {
    return NextResponse.json({ error: "level must be a number 0-1" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.update({
    where: { id: Number(params.id) },
    data: { level },
  });
  return NextResponse.json(item);
}
