import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { accumulatedShiftAsOf, getRotationScheduleSource, type ShiftDelta } from "@/lib/rotation-core";
import { getTrashAssignment, getDishesAssignment } from "@/lib/rotation-assignments";
import { recordShift } from "@/lib/rotation-core";

/**
 * Regression coverage for the reported bug: "I just recorded a shift but the
 * main calendar in the main dashboard doesn't reflect the changes."
 *
 * Root cause: duty-tenants.ts used to resolve a single pre-rotated roster
 * snapshot via getEffectiveRosterLabels(rotationType, date = new Date()) —
 * one shift value computed as of "today" — then every calendar tile for
 * every date in the visible month indexed into that ONE array via plain
 * weekIndex % length. A shift whose effectiveDate fell anywhere other than
 * exactly "today" (in particular tomorrow, which is ShiftPanel's default
 * effectiveDate) was silently excluded from every tile, including the
 * future dates it should have applied to.
 *
 * The fix ships the roster PLUS every shift delta (RotationScheduleSource)
 * to the calendar, and resolves each tile's assignment independently via
 * accumulatedShiftAsOf(shifts, thatTile'sDate) instead of one baked-in
 * offset. These tests pin that per-date resolution directly.
 */

const ADMIN_CLERK_ID = "test_rcs_admin";
const TENANT_CLERK_ID_PREFIX = "test_rcs_tenant_";

let adminUserId: number;

beforeAll(async () => {
  await prisma.rotationShift.deleteMany({ where: { rotationType: "TRASH_DISHES" } });
  await prisma.rotationUnit.deleteMany({ where: { rotationType: "TRASH_DISHES" } });

  let adminUser = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!adminUser) {
    adminUser = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });
  }
  adminUserId = adminUser.id;

  const tenantIds: number[] = [];
  for (const name of ["RCS_A", "RCS_B", "RCS_C"]) {
    const clerkId = TENANT_CLERK_ID_PREFIX + name;
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({ data: { clerkId, role: "TENANT", registrationComplete: true } });
    }
    let tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name, gender: "MALE", userId: user.id, isActive: true } });
    }
    tenantIds.push(tenant.id);
  }

  for (let i = 0; i < tenantIds.length; i++) {
    await prisma.rotationUnit.create({ data: { rotationType: "TRASH_DISHES", order: i, tenantId: tenantIds[i] } });
  }
});

describe("accumulatedShiftAsOf (pure)", () => {
  it("sums only shifts whose effectiveDate is on/before the given date", () => {
    const shifts: ShiftDelta[] = [
      { effectiveDate: "2025-01-09", offsetPositions: 2 },
      { effectiveDate: "2025-01-23", offsetPositions: -1 },
    ];
    expect(accumulatedShiftAsOf(shifts, new Date(2025, 0, 2))).toBe(0); // before both
    expect(accumulatedShiftAsOf(shifts, new Date(2025, 0, 9))).toBe(2); // first boundary, inclusive
    expect(accumulatedShiftAsOf(shifts, new Date(2025, 0, 16))).toBe(2); // between the two
    expect(accumulatedShiftAsOf(shifts, new Date(2025, 0, 23))).toBe(1); // second boundary, inclusive
    expect(accumulatedShiftAsOf(shifts, new Date(2025, 1, 6))).toBe(1); // after both
  });
});

describe("calendar-facing resolution reflects a shift recorded with effectiveDate = tomorrow", () => {
  it("previously (single 'today' snapshot) this shift would be invisible on the calendar; now it's reflected for dates on/after it", async () => {
    // The exact trigger: ShiftPanel defaults to tomorrow's date as
    // effectiveDate. getAccumulatedShift/getEffectiveRosterLabels used
    // `date = new Date()` (today) by default, which excludes a
    // tomorrow-effective shift — so the old pre-rotated snapshot never
    // included it, no matter which month the calendar was showing.
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await recordShift("TRASH_DISHES", {
      effectiveDate: tomorrow,
      offsetPositions: 1,
      actorUserId: adminUserId,
      reason: "regression test",
    });

    const source = await getRotationScheduleSource("TRASH_DISHES");

    // Find a Thursday on/after tomorrow to exercise the shifted assignment.
    const day = new Date(tomorrow);
    while (day.getDay() !== 4) day.setDate(day.getDate() + 1);

    const withShift = getTrashAssignment(day, source);
    const withoutShift = getTrashAssignment(day, { roster: source.roster, shifts: [], recycleShifts: [] });
    expect(withShift.tenant).not.toBe(withoutShift.tenant);
  });
});

describe("two shifts with different effective dates in the same visible month", () => {
  it("resolves the correct, distinct assignment before the first boundary, between the two, and after the second", async () => {
    await prisma.rotationShift.deleteMany({ where: { rotationType: "TRASH_DISHES" } });

    // recordShift() rejects a past effectiveDate (by design — can't
    // retroactively alter history), so these historical boundary rows are
    // inserted directly, same as the "stacks on top of an already-recorded
    // shift" case in rotation-shift-preview.test.ts.
    await prisma.rotationShift.create({
      data: {
        rotationType: "TRASH_DISHES",
        effectiveDate: new Date(2025, 0, 9), // wk2
        offsetPositions: -1,
        actorUserId: adminUserId,
        previousUnitLabel: "RCS_B",
        newUnitLabel: "RCS_A",
      },
    });
    await prisma.rotationShift.create({
      data: {
        rotationType: "TRASH_DISHES",
        effectiveDate: new Date(2025, 0, 23), // wk4
        offsetPositions: 1,
        actorUserId: adminUserId,
        previousUnitLabel: "RCS_C",
        newUnitLabel: "RCS_A",
      },
    });

    const source = await getRotationScheduleSource("TRASH_DISHES");

    const before = getTrashAssignment(new Date(2025, 0, 2), source).tenant; // wk1, before both shifts
    const betweenTheTwo = getTrashAssignment(new Date(2025, 0, 16), source).tenant; // wk3, between
    const afterBoth = getTrashAssignment(new Date(2025, 0, 30), source).tenant; // wk5, after both

    // wk1: baseIndex 0, shift 0 -> RCS_A
    expect(before).toBe("RCS_A");
    // wk3: baseIndex 2, shift -1 (only first shift applies) -> index 1 -> RCS_B
    expect(betweenTheTwo).toBe("RCS_B");
    // wk5: baseIndex 4, shift -1 + 1 = 0 (both apply) -> index 4 % 3 = 1 -> RCS_B
    expect(afterBoth).toBe("RCS_B");
    // The key assertion: the "between" and "after" results differ from what
    // a single global offset (the old snapshot bug) would have produced —
    // a single offset can only be right for one of these three ranges.
    expect(betweenTheTwo).not.toBe(before);
  });

  it("dishes resolves identically to trash for the same shifts (shared roster)", async () => {
    const source = await getRotationScheduleSource("TRASH_DISHES");
    const friday = new Date(2025, 0, 17); // same week as Jan 16 Thursday (wk3)
    const dishesTenant = getDishesAssignment(friday, source);
    const trashTenant = getTrashAssignment(new Date(2025, 0, 16), source).tenant;
    expect(dishesTenant).toBe(trashTenant);
  });
});
