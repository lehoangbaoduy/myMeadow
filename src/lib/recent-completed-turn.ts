import { prisma } from "@/lib/prisma";
import { unitLabel } from "@/lib/rotation-core";

export interface RecentCompletedTurn {
  choreTable: "TRASH" | "DISHES" | "BATHROOM";
  label: string;
  date: string;
  completedAt: string;
}

const unitInclude = {
  unit: {
    include: {
      tenant: { select: { id: true, name: true } },
      team: { include: { members: { include: { tenant: { select: { id: true, name: true } } } } } },
    },
  },
} as const;

/** Most recent COMPLETED occurrence across all three chore tables, or null if nothing has ever been marked completed. */
export async function getMostRecentCompletedTurn(): Promise<RecentCompletedTurn | null> {
  const [trash, dishes, bathroom] = await Promise.all([
    prisma.trashAssignment.findFirst({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" }, include: unitInclude }),
    prisma.dishesAssignment.findFirst({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" }, include: unitInclude }),
    prisma.bathroomAssignment.findFirst({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" }, include: unitInclude }),
  ]);

  const candidates = [
    trash && { choreTable: "TRASH" as const, row: trash },
    dishes && { choreTable: "DISHES" as const, row: dishes },
    bathroom && { choreTable: "BATHROOM" as const, row: bathroom },
  ].filter((c): c is { choreTable: "TRASH" | "DISHES" | "BATHROOM"; row: NonNullable<typeof trash> } => c !== null && c.row.completedAt !== null);

  if (candidates.length === 0) return null;

  const latest = candidates.reduce((a, b) => (a.row.completedAt! > b.row.completedAt! ? a : b));
  const label = latest.row.unit ? unitLabel(latest.row.unit) : (latest.row.deletedUnitLabel ?? "Deleted User");

  return {
    choreTable: latest.choreTable,
    label,
    date: latest.row.date.toISOString().split("T")[0],
    completedAt: latest.row.completedAt!.toISOString(),
  };
}
