export interface TrashEvent {
  date: Date;
  tenantName: string;
  hasRecycle: boolean;
  isOverride: boolean;
}

// Anchor: first Thursday on or after Jan 1 2025 = Jan 2 2025
const BASE_THURSDAY = new Date(2025, 0, 2);

export function getWeekIndex(thursday: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round(
    (thursday.getTime() - BASE_THURSDAY.getTime()) / msPerWeek
  );
}

export function getThursdayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysUntilThursday = (4 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d;
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

export function generateSchedule(
  thursdays: Date[],
  maleTenants: string[]
): TrashEvent[] {
  if (maleTenants.length === 0) return [];
  return thursdays.map((date) => {
    const weekIdx = getWeekIndex(date);
    const tenantName =
      maleTenants[
        ((weekIdx % maleTenants.length) + maleTenants.length) %
          maleTenants.length
      ];
    const hasRecycle = weekIdx % 2 !== 0;
    return { date, tenantName, hasRecycle, isOverride: false };
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
