export interface DishesEvent {
  date: Date;
  tenantName: string;
  isOverride: boolean;
}

// Anchor: Jan 3 2025 (Friday) — 2 days before the previous Sunday anchor (Jan 5 2025),
// so week indices line up exactly with the old Sunday-based schedule and nobody's
// turn shifts when the rotation day moves from Sunday to Friday.
const BASE_FRIDAY = new Date(2025, 0, 3);

export function getWeekIndex(friday: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((friday.getTime() - BASE_FRIDAY.getTime()) / msPerWeek);
}

export function getFridayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysUntilFriday = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilFriday);
  return d;
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

export function generateSchedule(
  fridays: Date[],
  activeTenants: string[]
): DishesEvent[] {
  if (activeTenants.length === 0) return [];
  return fridays.map((date) => {
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
