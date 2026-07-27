import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PersonalInventoryItem } from "@prisma/client";

/**
 * Owner-or-admin gate for mutating an item (edit, delete, manage its share
 * list). Sharing is read-only visibility, not co-editing — a tenant an item
 * is shared with must never pass this check.
 */
export async function authorizeItemWrite(
  clerkId: string,
  itemId: number
): Promise<NextResponse | { item: PersonalInventoryItem }> {
  const caller = await prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.personalInventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = caller.tenant?.id === item.tenantId;
  if (!isOwner && caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { item };
}
