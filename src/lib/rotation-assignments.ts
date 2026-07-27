import { getThursdayOfWeek } from "@/lib/trash-schedule";
import { getWeekIndex, isRecycleWeek, bathroomOccurrenceIndexFromParts } from "@/lib/rotation-core";
import type { RosterLabelEntry } from "@/lib/duty-tenants";

/**
 * Pure rotation-assignment math shared by every screen that renders the
 * trash/bathroom/dishes calendar (desktop `EventCalendar` and its mobile
 * counterpart) — kept in one place so the two can never compute different
 * assignments for the same day. Week-index and recycle-parity math is
 * delegated to rotation-core.ts so this can never drift from the
 * server-side resolver again.
 */

const EMPTY_ENTRY: RosterLabelEntry = { label: "—", members: [] };

function pickFromRoster(roster: RosterLabelEntry[], index: number): RosterLabelEntry {
  if (roster.length === 0) return EMPTY_ENTRY;
  return roster[((index % roster.length) + roster.length) % roster.length];
}

export function getTrashAssignment(thursday: Date, roster: RosterLabelEntry[]) {
  const weekIdx = getWeekIndex(thursday);
  const unit = pickFromRoster(roster, weekIdx);
  return { tenant: unit.label, members: unit.members, hasRecycle: isRecycleWeek(weekIdx) };
}

/** `date` is any day — the semimonthly occurrence (1st or 15th cycle) is derived from its calendar day, not the weekday. */
export function getBathroomAssignment(date: Date, roster: RosterLabelEntry[]) {
  const index = bathroomOccurrenceIndexFromParts(date.getFullYear(), date.getMonth(), date.getDate());
  return pickFromRoster(roster, index).label;
}

export function getDishesAssignment(friday: Date, roster: RosterLabelEntry[]) {
  const weekIdx = getWeekIndex(friday);
  return pickFromRoster(roster, weekIdx).label;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export { getThursdayOfWeek };
