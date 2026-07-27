import { getWeekIndex, getFridayOfWeek, getFridaysInMonth } from "@/lib/rotation-core";

export interface DishesEvent {
  date: Date;
  tenantName: string;
  isOverride: boolean;
}

export function generateSchedule(fridays: Date[], roster: string[]): DishesEvent[] {
  if (roster.length === 0) return [];
  return fridays.map((date) => {
    const weekIdx = getWeekIndex(date);
    const tenantName = roster[((weekIdx % roster.length) + roster.length) % roster.length];
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
