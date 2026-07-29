/**
 * Was a resident active at any point during the month that starts at
 * `periodStart`? Used to reconstruct bill/rent shares for past periods
 * instead of using only the resident's current isActive snapshot.
 *
 * Rules (per household decision, not a general proration policy):
 * - Currently active residents always count.
 * - A deactivated resident with no recorded deactivatedAt (i.e. they were
 *   turned off before this field existed) is treated as active for every
 *   past period — conservative default until an admin backdates them.
 * - A deactivated resident counts for a period if their deactivation date
 *   falls on/after that period's first day — matches how rent/utilities
 *   are never prorated by day elsewhere in this app: active for any part
 *   of the month means they share that month's bill.
 */
export function isActiveForPeriod(
  tenant: { isActive: boolean; deactivatedAt: Date | string | null },
  periodStart: Date
): boolean {
  if (tenant.isActive) return true;
  if (tenant.deactivatedAt == null) return true;
  return new Date(tenant.deactivatedAt) >= periodStart;
}
