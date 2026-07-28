import { prisma } from "@/lib/prisma";
import type { InventoryItem as PrismaInventoryItem, InventoryLevelLog } from "@prisma/client";
import type { InventoryItem } from "@/lib/inventory";

export function serializeItem(item: PrismaInventoryItem, lastLog: InventoryLevelLog | null): InventoryItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    icon: item.icon,
    level: item.level,
    isCustom: item.isCustom,
    lastRestock: lastLog ? { name: lastLog.changedByName, at: lastLog.createdAt.toISOString() } : null,
  };
}

/** Batched last-restock lookup for the list endpoint — one query, not N+1. */
export async function attachLastRestocks(items: PrismaInventoryItem[]): Promise<InventoryItem[]> {
  if (items.length === 0) return [];

  const latestLogs = await prisma.inventoryLevelLog.findMany({
    where: { itemId: { in: items.map((i) => i.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    distinct: ["itemId"],
  });
  const latestByItemId = new Map(latestLogs.map((log) => [log.itemId, log]));

  return items.map((item) => serializeItem(item, latestByItemId.get(item.id) ?? null));
}
