import { getWeekIndex, getThursdayOfWeek, getThursdaysInMonth, resolveHasRecycle, accumulatedShiftAsOf } from "@/lib/rotation-core";
import type { RotationScheduleSource } from "@/lib/duty-tenants";

export interface TrashEvent {
  date: Date;
  tenantName: string;
  hasRecycle: boolean;
  isOverride: boolean;
}

export function generateSchedule(thursdays: Date[], source: RotationScheduleSource): TrashEvent[] {
  const { roster, shifts, recycleShifts } = source;
  if (roster.length === 0) return [];
  return thursdays.map((date) => {
    const weekIdx = getWeekIndex(date);
    const shift = accumulatedShiftAsOf(shifts, date);
    const tenantName = roster[((weekIdx + shift) % roster.length + roster.length) % roster.length].label;
    return { date, tenantName, hasRecycle: resolveHasRecycle(weekIdx, recycleShifts), isOverride: false };
  });
}

export function mergeWithOverrides(
  generated: TrashEvent[],
  overrides: { date: Date; tenantName: string; hasRecycle: boolean }[]
): TrashEvent[] {
  return generated.map((event) => {
    const override = overrides.find(
      (o) =>
        o.date.getFullYear() === event.date.getFullYear() &&
        o.date.getMonth() === event.date.getMonth() &&
        o.date.getDate() === event.date.getDate()
    );
    if (override) {
      return { ...override, date: event.date, isOverride: true };
    }
    return event;
  });
}

export { getWeekIndex, getThursdayOfWeek, getThursdaysInMonth };
