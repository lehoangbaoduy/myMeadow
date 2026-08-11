import { prisma } from "@/lib/prisma";
import { unitLabel } from "@/lib/rotation-core";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";
import type { RotationType } from "@prisma/client";

export interface RosterUnitRow {
  id: number;
  order: number;
  tenantId: number | null;
  teamId: number | null;
  label: string;
  members: { tenantId: number; name: string }[];
}

export interface ShiftRow {
  id: number;
  effectiveDate: string;
  offsetPositions: number;
  previousUnitLabel: string;
  newUnitLabel: string;
  reason: string | null;
  actorName: string;
  createdAt: string;
}

export interface RecycleShiftRow {
  id: number;
  effectiveDate: string;
  hasRecycle: boolean;
  reason: string | null;
  actorName: string;
  createdAt: string;
}

export interface EligibleTenant {
  id: number;
  name: string;
}

export interface RotationTypeData {
  roster: RosterUnitRow[];
  recentShifts: ShiftRow[];
}

export interface OccurrenceRow {
  id: number;
  date: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
}

export interface RotationAdminData {
  TRASH_DISHES: RotationTypeData;
  BATHROOM: RotationTypeData;
  allActiveTenants: EligibleTenant[];
  recentTrash: OccurrenceRow[];
  recentDishes: OccurrenceRow[];
  recentBathroom: OccurrenceRow[];
  recentRecycleShifts: RecycleShiftRow[];
}

const unitInclude = {
  tenant: { select: { id: true, name: true } },
  team: { include: { members: { include: { tenant: { select: { id: true, name: true } } } } } },
};

async function getRotationTypeData(rotationType: RotationType): Promise<RotationTypeData> {
  const [units, shifts] = await Promise.all([
    prisma.rotationUnit.findMany({ where: { rotationType }, orderBy: { order: "asc" }, include: unitInclude }),
    prisma.rotationShift.findMany({ where: { rotationType }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const actorIds = Array.from(new Set(shifts.map((s) => s.actorUserId)));
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, include: { tenant: { select: { name: true } } } })
    : [];
  const actorNameById = new Map(actors.map((a) => [a.id, a.tenant?.name ?? "Admin"]));

  return {
    roster: units.map((u) => ({
      id: u.id,
      order: u.order,
      tenantId: u.tenantId,
      teamId: u.teamId,
      label: unitLabel(u),
      members: u.team
        ? u.team.members.map((m) => ({ tenantId: m.tenant.id, name: m.tenant.name }))
        : u.tenant
          ? [{ tenantId: u.tenant.id, name: u.tenant.name }]
          : [],
    })),
    recentShifts: shifts.map((s) => ({
      id: s.id,
      effectiveDate: s.effectiveDate.toISOString().split("T")[0],
      offsetPositions: s.offsetPositions,
      previousUnitLabel: s.previousUnitLabel,
      newUnitLabel: s.newUnitLabel,
      reason: s.reason,
      actorName: actorNameById.get(s.actorUserId) ?? "Admin",
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

async function getRecentOccurrences<T extends { id: number; date: Date; status: string; notes: string | null; completedAt: Date | null }>(
  findMany: (args: { where: { status: { not: "SCHEDULED" } }; orderBy: { date: "desc" }; take: number }) => Promise<T[]>
): Promise<OccurrenceRow[]> {
  const rows = await findMany({ where: { status: { not: "SCHEDULED" } }, orderBy: { date: "desc" }, take: 5 });
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().split("T")[0],
    status: r.status,
    notes: r.notes,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
  }));
}

async function getRecentRecycleShifts(): Promise<RecycleShiftRow[]> {
  const shifts = await prisma.recycleShift.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

  const actorIds = Array.from(new Set(shifts.map((s) => s.actorUserId)));
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, include: { tenant: { select: { name: true } } } })
    : [];
  const actorNameById = new Map(actors.map((a) => [a.id, a.tenant?.name ?? "Admin"]));

  return shifts.map((s) => ({
    id: s.id,
    effectiveDate: s.effectiveDate.toISOString().split("T")[0],
    hasRecycle: s.hasRecycle,
    reason: s.reason,
    actorName: actorNameById.get(s.actorUserId) ?? "Admin",
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function getRotationAdminData(): Promise<RotationAdminData> {
  const [trashDishes, bathroom, activeTenants, recentTrash, recentDishes, recentBathroom, recentRecycleShifts] = await Promise.all([
    getRotationTypeData("TRASH_DISHES"),
    getRotationTypeData("BATHROOM"),
    prisma.tenant.findMany({ where: { isActive: true }, include: { user: { select: { clerkId: true } } } }),
    getRecentOccurrences((args) => prisma.trashAssignment.findMany(args)),
    getRecentOccurrences((args) => prisma.dishesAssignment.findMany(args)),
    getRecentOccurrences((args) => prisma.bathroomAssignment.findMany(args)),
    getRecentRecycleShifts(),
  ]);

  const allActiveTenants = activeTenants
    .filter((t) => !isPlaceholderClerkId(t.user.clerkId))
    .map((t) => ({ id: t.id, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { TRASH_DISHES: trashDishes, BATHROOM: bathroom, allActiveTenants, recentTrash, recentDishes, recentBathroom, recentRecycleShifts };
}
