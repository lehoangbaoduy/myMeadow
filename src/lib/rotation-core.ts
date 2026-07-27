import { prisma } from "@/lib/prisma";
import type { RotationType } from "@prisma/client";

/**
 * Single source of truth for "who has position P of rotation R on date D".
 * Replaces the modulo logic that used to be duplicated across
 * trash-schedule.ts, dishes-schedule.ts, rotation-assignments.ts, and
 * send-reminder.ts (and which had drifted into disagreeing with itself on
 * recycle-week parity). Everything that needs a rotation assignment should
 * go through this module.
 */

export type ChoreTable = "TRASH" | "DISHES" | "BATHROOM";

const ROTATION_TYPES: RotationType[] = ["TRASH_DISHES", "BATHROOM"];
const CHORE_TABLES: ChoreTable[] = ["TRASH", "DISHES", "BATHROOM"];

/** Validates a raw route-param string against the RotationType enum (used by the roster/teams/shift routes, which are shared across trash+dishes). */
export function parseRotationType(raw: string): RotationType | null {
  return (ROTATION_TYPES as string[]).includes(raw) ? (raw as RotationType) : null;
}

/** Validates a raw route-param string against ChoreTable (used by the occurrence-complete route, which needs to distinguish trash from dishes even though they share a RotationType). */
export function parseChoreTable(raw: string): ChoreTable | null {
  return (CHORE_TABLES as string[]).includes(raw) ? (raw as ChoreTable) : null;
}

/** Parses a "YYYY-MM-DD" route param as a local-midnight Date, rejecting malformed or out-of-range dates (e.g. 2025-02-30). `new Date(str)` is deliberately avoided — it parses as UTC midnight, which can land on the previous local day. */
export function parseLocalDateString(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export interface ResolvedMember {
  tenantId: number;
  name: string;
}

export interface ResolvedUnit {
  unitId: number;
  label: string;
  members: ResolvedMember[];
  isTeam: boolean;
}

// Anchor: first Thursday on or after Jan 1 2025 = Jan 2 2025. Trash and
// dishes share this anchor (dishes' Friday lands in the same calendar week),
// so both chores resolve to the same base index for a given week.
const BASE_THURSDAY = new Date(2025, 0, 2);

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Forward-rolling "next Thursday/Friday on or after this date" — matches the
// original trash-schedule.ts/dishes-schedule.ts semantics, used by callers
// that want "the upcoming chore day from today" (e.g. send-reminder.ts).
function getThursdayOfWeek(date: Date): Date {
  const d = toDateOnly(date);
  const daysUntilThursday = (4 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d;
}

function getFridayOfWeek(date: Date): Date {
  const d = toDateOnly(date);
  const daysUntilFriday = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilFriday);
  return d;
}

// Backward-or-same "Thursday of this calendar week" — used internally so any
// day of the week (a Thursday for trash, a Friday for dishes) normalizes to
// the same week index, which is what makes trash+dishes sync trivial.
function thursdayOfSameWeek(date: Date): Date {
  const d = toDateOnly(date);
  const diff = (d.getDay() - 4 + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function getWeekIndex(date: Date): number {
  const thursday = thursdayOfSameWeek(date);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((thursday.getTime() - BASE_THURSDAY.getTime()) / msPerWeek);
}

/** Canonical recycle-week rule (previously inconsistent between call sites). */
export function isRecycleWeek(weekIndex: number): boolean {
  return weekIndex % 2 !== 0;
}

export function getThursdaysInMonth(year: number, month: number): Date[] {
  const thursdays: Date[] = [];
  const d = new Date(year, month, 1);
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7));
  while (d.getMonth() === month) {
    thursdays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return thursdays;
}

export function getFridaysInMonth(year: number, month: number): Date[] {
  const fridays: Date[] = [];
  const d = new Date(year, month, 1);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  while (d.getMonth() === month) {
    fridays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return fridays;
}

/** The 1st and 15th of the given month (or just whichever hasn't passed, per caller). */
export function getBathroomDatesInMonth(year: number, month: number): Date[] {
  return [new Date(year, month, 1), new Date(year, month, 15)];
}

export async function householdTimezone(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "householdTimezone" } });
  return setting?.value ?? "UTC";
}

async function localDateParts(date: Date, timezone: string): Promise<{ year: number; month: number; day: number }> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") - 1, day: get("day") };
}

/** Twice-a-month occurrence index: month*2 for the 1st, month*2 + 1 for the 15th. Anchor-free, DST-proof. */
export function bathroomOccurrenceIndexFromParts(year: number, month: number, day: number): number {
  return year * 24 + month * 2 + (day >= 15 ? 1 : 0);
}

async function getBathroomOccurrenceIndex(date: Date): Promise<number> {
  const tz = await householdTimezone();
  const { year, month, day } = await localDateParts(date, tz);
  return bathroomOccurrenceIndexFromParts(year, month, day);
}

async function getBaseIndex(rotationType: RotationType, date: Date): Promise<number> {
  if (rotationType === "BATHROOM") return getBathroomOccurrenceIndex(date);
  return getWeekIndex(date);
}

export async function getAccumulatedShift(rotationType: RotationType, date: Date): Promise<number> {
  const shifts = await prisma.rotationShift.findMany({
    where: { rotationType, effectiveDate: { lte: date } },
    select: { offsetPositions: true },
  });
  return shifts.reduce((sum, s) => sum + s.offsetPositions, 0);
}

function mod(n: number, len: number): number {
  return ((n % len) + len) % len;
}

interface LabelableUnit {
  tenant: { id: number; name: string } | null;
  team: { name: string | null; members: { tenant: { id: number; name: string } }[] } | null;
}

function resolveLabelAndMembers(unit: LabelableUnit): { label: string; members: ResolvedMember[]; isTeam: boolean } {
  if (unit.team) {
    const members = unit.team.members.map((m) => ({ tenantId: m.tenant.id, name: m.tenant.name }));
    const label = unit.team.name ?? members.map((m) => m.name).join(" & ");
    return { label, members, isTeam: true };
  }
  return {
    label: unit.tenant?.name ?? "Deleted User",
    members: unit.tenant ? [{ tenantId: unit.tenant.id, name: unit.tenant.name }] : [],
    isTeam: false,
  };
}

/** Display label for a single RotationUnit row (team name/members joined, solo tenant name, or "Deleted User"). Used by routes that fetch one unit at a time (e.g. an assignment's historical `unit` relation) rather than the whole roster. */
export function unitLabel(unit: LabelableUnit): string {
  return resolveLabelAndMembers(unit).label;
}

export function getRoster(rotationType: RotationType) {
  return prisma.rotationUnit.findMany({
    where: { rotationType },
    orderBy: { order: "asc" },
    include: {
      tenant: { select: { id: true, name: true } },
      team: {
        include: { members: { include: { tenant: { select: { id: true, name: true } } } } },
      },
    },
  });
}

/** Resolves who is assigned for a given rotation type on a given date, or null if the roster is empty. */
export async function resolveUnit(rotationType: RotationType, date: Date): Promise<ResolvedUnit | null> {
  const roster = await getRoster(rotationType);
  if (roster.length === 0) return null;

  const baseIndex = await getBaseIndex(rotationType, date);
  const shift = await getAccumulatedShift(rotationType, date);
  const position = mod(baseIndex + shift, roster.length);
  const unit = roster[position];

  const { label, members, isTeam } = resolveLabelAndMembers(unit);
  return { unitId: unit.id, label, members, isTeam };
}

export interface RosterLabelEntry {
  label: string;
  members: string[];
}

/**
 * The roster for a rotation type, pre-rotated so a caller doing plain
 * `roster[weekIndex % roster.length]` client-side math lands on the same
 * unit `resolveUnit` would compute server-side (accumulated shifts folded
 * into the array order). Used by calendar UI that renders a whole month of
 * tiles without a round-trip per date. Does not track shift boundaries
 * that fall mid-range — the persisted TrashAssignment/DishesAssignment/
 * BathroomAssignment rows (via ensureOccurrence) remain the source of truth
 * for admin actions and history; this is a fast preview only.
 */
export async function getEffectiveRosterLabels(
  rotationType: RotationType,
  date: Date = new Date()
): Promise<RosterLabelEntry[]> {
  const roster = await getRoster(rotationType);
  const n = roster.length;
  if (n === 0) return [];

  const resolved = roster.map((unit) => {
    const { label, members } = resolveLabelAndMembers(unit);
    return { label, members: members.map((m) => m.name) };
  });

  const shift = await getAccumulatedShift(rotationType, date);
  const offset = mod(shift, n);
  return Array.from({ length: n }, (_, i) => resolved[mod(i + offset, n)]);
}

/** Full Tenant records (contact info included) for whoever is assigned on `date` — used to deliver reminders to every member of a team. */
export async function resolveUnitTenants(rotationType: RotationType, date: Date) {
  const unit = await resolveUnit(rotationType, date);
  if (!unit || unit.members.length === 0) return [];
  return prisma.tenant.findMany({
    where: { id: { in: unit.members.map((m) => m.tenantId) } },
  });
}

export interface RecordShiftInput {
  effectiveDate: Date;
  offsetPositions: number;
  actorUserId: number;
  reason?: string;
}

/**
 * Records a shift as an effective-dated delta rather than mutating the
 * roster. Past occurrences are already materialized rows and are untouched;
 * only resolution for dates >= effectiveDate is affected. This is what makes
 * "don't retroactively alter completed history" automatic.
 */
export async function recordShift(rotationType: RotationType, input: RecordShiftInput): Promise<{ id: number }> {
  const today = toDateOnly(new Date());
  const effective = toDateOnly(input.effectiveDate);
  if (effective < today) {
    throw new Error("effectiveDate cannot be in the past");
  }
  if (input.offsetPositions === 0) {
    throw new Error("offsetPositions cannot be 0");
  }

  const roster = await getRoster(rotationType);
  const n = roster.length;
  if (n === 0) {
    throw new Error("cannot record a shift for an empty roster");
  }

  // Compute both labels from a single roster fetch instead of re-resolving
  // after the write — a second resolveUnit() call inside a transaction reads
  // through the module-level `prisma` client, which is a different
  // connection than `tx` and would not see the just-created (uncommitted)
  // shift, silently producing before === after.
  const labelAt = (position: number) => resolveLabelAndMembers(roster[mod(position, n)]).label;
  const baseIndex = await getBaseIndex(rotationType, effective);
  const priorShift = await getAccumulatedShift(rotationType, effective);

  const shift = await prisma.rotationShift.create({
    data: {
      rotationType,
      effectiveDate: effective,
      offsetPositions: input.offsetPositions,
      actorUserId: input.actorUserId,
      reason: input.reason,
      previousUnitLabel: labelAt(baseIndex + priorShift),
      newUnitLabel: labelAt(baseIndex + priorShift + input.offsetPositions),
    },
  });

  return { id: shift.id };
}

const TABLE_TO_ROTATION_TYPE: Record<ChoreTable, RotationType> = {
  TRASH: "TRASH_DISHES",
  DISHES: "TRASH_DISHES",
  BATHROOM: "BATHROOM",
};

/**
 * Ensures a persisted occurrence row exists for (choreTable, date), computing
 * its unit from the current roster + shifts if one doesn't exist yet.
 * Occurrences are materialized lazily/on-demand rather than batch-generated
 * months ahead, so storage stays proportional to actual usage (marking
 * complete/missed, or querying "most recent completed turn").
 */
export async function ensureOccurrence(choreTable: ChoreTable, date: Date) {
  const rotationType = TABLE_TO_ROTATION_TYPE[choreTable];

  if (choreTable === "TRASH") {
    const existing = await prisma.trashAssignment.findUnique({ where: { date } });
    if (existing) return existing;
    const resolved = await resolveUnit(rotationType, date);
    const weekIdx = getWeekIndex(date);
    return prisma.trashAssignment.create({
      data: {
        date,
        unitId: resolved?.unitId ?? null,
        deletedUnitLabel: resolved ? null : "Unassigned",
        isRecycle: isRecycleWeek(weekIdx),
      },
    });
  }

  if (choreTable === "DISHES") {
    const existing = await prisma.dishesAssignment.findUnique({ where: { date } });
    if (existing) return existing;
    const resolved = await resolveUnit(rotationType, date);
    return prisma.dishesAssignment.create({
      data: {
        date,
        unitId: resolved?.unitId ?? null,
        deletedUnitLabel: resolved ? null : "Unassigned",
      },
    });
  }

  const existing = await prisma.bathroomAssignment.findUnique({ where: { date } });
  if (existing) return existing;
  const resolved = await resolveUnit(rotationType, date);
  return prisma.bathroomAssignment.create({
    data: {
      date,
      unitId: resolved?.unitId ?? null,
      deletedUnitLabel: resolved ? null : "Unassigned",
    },
  });
}

export { getWeekIndex, getThursdayOfWeek, getFridayOfWeek, BASE_THURSDAY };
