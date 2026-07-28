import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PersonalInventoryItem, PersonalInventoryList } from "@prisma/client";

/**
 * Owner-or-admin gate for mutating a list (rename, delete, manage its share
 * list). Sharing is read-only visibility, not co-editing — a tenant a list
 * is shared with must never pass this check.
 */
export async function authorizeListWrite(
  clerkId: string,
  listId: number
): Promise<NextResponse | { list: PersonalInventoryList }> {
  const caller = await prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await prisma.personalInventoryList.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = caller.tenant?.id === list.tenantId;
  if (!isOwner && caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { list };
}

/**
 * Owner-or-admin gate for mutating an item (edit, delete). Ownership is
 * derived from the item's parent list, not stored on the item itself.
 */
export async function authorizeItemWrite(
  clerkId: string,
  itemId: number
): Promise<NextResponse | { item: PersonalInventoryItem & { list: PersonalInventoryList } }> {
  const caller = await prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.personalInventoryItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = caller.tenant?.id === item.list.tenantId;
  if (!isOwner && caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { item };
}
