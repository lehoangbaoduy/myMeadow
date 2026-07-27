import { getWeekIndex, getThursdayOfWeek, getThursdaysInMonth, isRecycleWeek } from "@/lib/rotation-core";

export interface TrashEvent {
  date: Date;
  tenantName: string;
  hasRecycle: boolean;
  isOverride: boolean;
}

export function generateSchedule(thursdays: Date[], roster: string[]): TrashEvent[] {
  if (roster.length === 0) return [];
  return thursdays.map((date) => {
    const weekIdx = getWeekIndex(date);
    const tenantName = roster[((weekIdx % roster.length) + roster.length) % roster.length];
    return { date, tenantName, hasRecycle: isRecycleWeek(weekIdx), isOverride: false };
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
