import { getThursdayOfWeek } from "@/lib/trash-schedule";
import { getWeekIndex, isRecycleWeek, bathroomOccurrenceIndexFromParts, accumulatedShiftAsOf, nextBathroomOccurrenceDate } from "@/lib/rotation-core";
import type { RosterLabelEntry, RotationScheduleSource } from "@/lib/duty-tenants";

/**
 * Pure rotation-assignment math shared by every screen that renders the
 * trash/bathroom/dishes calendar (desktop `EventCalendar` and its mobile
 * counterpart) — kept in one place so the two can never compute different
 * assignments for the same day. Week-index and recycle-parity math is
 * delegated to rotation-core.ts so this can never drift from the
 * server-side resolver again.
 *
 * Each date resolves its OWN accumulated shift via accumulatedShiftAsOf(),
 * rather than indexing into a single roster snapshot pre-rotated as of
 * "today" — that snapshot approach made every tile in a visible month use
 * the same offset regardless of the date it represented, so a shift whose
 * effectiveDate fell inside the shown range (before or after "today")
 * silently failed to change what the calendar displayed.
 */

const EMPTY_ENTRY: RosterLabelEntry = { label: "—", members: [] };

function pickFromRoster(source: RotationScheduleSource, baseIndex: number, date: Date): RosterLabelEntry {
  const { roster, shifts } = source;
  if (roster.length === 0) return EMPTY_ENTRY;
  const shift = accumulatedShiftAsOf(shifts, date);
  const index = ((baseIndex + shift) % roster.length + roster.length) % roster.length;
  return roster[index];
}

export function getTrashAssignment(thursday: Date, source: RotationScheduleSource) {
  const weekIdx = getWeekIndex(thursday);
  const unit = pickFromRoster(source, weekIdx, thursday);
  return { tenant: unit.label, members: unit.members, hasRecycle: isRecycleWeek(weekIdx) };
}

/** `date` is any day — the semimonthly occurrence (1st or 15th cycle) is derived from its calendar day, not the weekday. */
export function getBathroomAssignment(date: Date, source: RotationScheduleSource) {
  const index = bathroomOccurrenceIndexFromParts(date.getFullYear(), date.getMonth(), date.getDate());
  return pickFromRoster(source, index, date).label;
}

export function getDishesAssignment(friday: Date, source: RotationScheduleSource) {
  const weekIdx = getWeekIndex(friday);
  return pickFromRoster(source, weekIdx, friday).label;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export { getThursdayOfWeek, nextBathroomOccurrenceDate };
