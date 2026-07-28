import { getWeekIndex, getFridayOfWeek, getFridaysInMonth, accumulatedShiftAsOf } from "@/lib/rotation-core";
import type { RotationScheduleSource } from "@/lib/duty-tenants";

export interface DishesEvent {
  date: Date;
  tenantName: string;
  isOverride: boolean;
}

export function generateSchedule(fridays: Date[], source: RotationScheduleSource): DishesEvent[] {
  const { roster, shifts } = source;
  if (roster.length === 0) return [];
  return fridays.map((date) => {
    const weekIdx = getWeekIndex(date);
    const shift = accumulatedShiftAsOf(shifts, date);
    const tenantName = roster[((weekIdx + shift) % roster.length + roster.length) % roster.length].label;
    return { date, tenantName, isOverride: false };
  });
}

export function mergeWithOverrides(
  generated: DishesEvent[],
  overrides: { date: Date; tenantName: string }[]
): DishesEvent[] {
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

export { getWeekIndex, getFridayOfWeek, getFridaysInMonth };
