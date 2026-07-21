import { getWeekIndex, getThursdayOfWeek } from "@/lib/trash-schedule";
import { getWeekIndex as getDishesWeekIndex } from "@/lib/dishes-schedule";

/**
 * Pure rotation-assignment math shared by every screen that renders the
 * trash/bathroom/dishes calendar (desktop `EventCalendar` and its mobile
 * counterpart) — kept in one place so the two can never compute different
 * assignments for the same day.
 */

export function getTrashAssignment(thursday: Date, trashTenants: string[]) {
  const weekIdx = getWeekIndex(thursday);
  const tenant = trashTenants.length > 0
    ? trashTenants[((weekIdx % trashTenants.length) + trashTenants.length) % trashTenants.length]
    : "—";
  const hasRecycle = weekIdx % 2 === 0;
  return { tenant, hasRecycle };
}

export function getBathroomAssignment(thursday: Date, bathroomTenants: string[]) {
  const weekIdx = getWeekIndex(thursday);
  return bathroomTenants.length > 0
    ? bathroomTenants[((Math.floor(weekIdx / 2) % bathroomTenants.length) + bathroomTenants.length) % bathroomTenants.length]
    : "—";
}

export function getDishesAssignment(friday: Date, dishesTenants: string[]) {
  const weekIdx = getDishesWeekIndex(friday);
  return dishesTenants.length > 0
    ? dishesTenants[((weekIdx % dishesTenants.length) + dishesTenants.length) % dishesTenants.length]
    : "—";
}

/** Returns the Thursday of the same ISO week as the given date (looking backward). */
export function getThursdayOfSameWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (day - 4 + 7) % 7; // days since last Thursday
  d.setDate(d.getDate() - diff);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export { getThursdayOfWeek };
