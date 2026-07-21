import { prisma } from "@/lib/prisma";
import { PLACEHOLDER_CLERK_PREFIX } from "@/lib/tenant-placeholder";

/**
 * Single source of truth for who's in each rotation (trash/bathroom/dishes).
 * Every site that computes or displays a rotation (calendar tiles, dashboard
 * cards, the reminder sender, the override APIs) must use these same
 * where/orderBy clauses — otherwise the rotation's week-index math can point
 * different screens at different people for the same week.
 *
 * A placeholder resident (reserved room slot, no real login) is kept
 * `isActive: false` so it never receives rent reminders or counts toward
 * "active resident" totals — but if an admin explicitly ticks a duty flag for
 * one, it must still enter that rotation. Hence the isActive-OR-placeholder
 * clause below, rather than a plain `isActive: true` filter.
 */
function activeOrPlaceholder() {
  return { OR: [{ isActive: true }, { user: { clerkId: { startsWith: PLACEHOLDER_CLERK_PREFIX } } }] };
}

export function getTrashDutyTenants() {
  return prisma.tenant.findMany({
    where: { trashDuty: true, ...activeOrPlaceholder() },
    orderBy: { id: "asc" },
  });
}

export function getBathroomDutyTenants() {
  return prisma.tenant.findMany({
    where: { bathroomDuty: true, ...activeOrPlaceholder() },
    orderBy: { id: "asc" },
  });
}

export function getDishesDutyTenants() {
  return prisma.tenant.findMany({
    where: { dishesDuty: true, ...activeOrPlaceholder() },
    orderBy: { id: "asc" },
  });
}
