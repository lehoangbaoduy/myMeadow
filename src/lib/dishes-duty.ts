import { prisma } from "@/lib/prisma";

/**
 * Single source of truth for who's in the dish-duty rotation. Every site that
 * computes or displays the dishes rotation (calendar tiles, admin/residents
 * dashboards, the reminder sender, the override API) must use this same
 * where/orderBy — otherwise the rotation's week-index math can point different
 * screens at different people for the same week.
 */
export function getDishesDutyTenants() {
  return prisma.tenant.findMany({
    where: { isActive: true, dishesDuty: true },
    orderBy: { id: "asc" },
  });
}
