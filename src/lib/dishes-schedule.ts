export interface DishesEvent {
  date: Date;
  tenantName: string;
  isOverride: boolean;
}

// Anchor: first Sunday on or after Jan 1 2025 = Jan 5 2025
const BASE_SUNDAY = new Date(2025, 0, 5);

export function getWeekIndex(sunday: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((sunday.getTime() - BASE_SUNDAY.getTime()) / msPerWeek);
}

export function getSundayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysUntilSunday = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntilSunday);
  return d;
}

export function getSundaysInMonth(year: number, month: number): Date[] {
  const sundays: Date[] = [];
  const d = new Date(year, month, 1);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  while (d.getMonth() === month) {
    sundays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

export function generateSchedule(
  sundays: Date[],
  activeTenants: string[]
): DishesEvent[] {
  if (activeTenants.length === 0) return [];
  return sundays.map((date) => {
    const weekIdx = getWeekIndex(date);
    const tenantName =
      activeTenants[
        ((weekIdx % activeTenants.length) + activeTenants.length) %
          activeTenants.length
      ];
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
