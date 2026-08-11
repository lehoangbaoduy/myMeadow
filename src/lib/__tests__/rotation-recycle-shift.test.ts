import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  isRecycleWeek,
  getWeekIndex,
  resolveHasRecycle,
  recordRecycleShift,
  previewRecycleShift,
  getRotationScheduleSource,
  type RecycleShiftDelta,
} from "@/lib/rotation-core";
import { getTrashAssignment } from "@/lib/rotation-assignments";

const ADMIN_CLERK_ID = "test_recycle_admin";

let adminUserId: number;

beforeAll(async () => {
  await prisma.recycleShift.deleteMany();

  let adminUser = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!adminUser) {
    adminUser = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });
  }
  adminUserId = adminUser.id;
});

describe("resolveHasRecycle (pure)", () => {
  it("falls back to the base parity rule when there are no overrides", () => {
    const wk0 = getWeekIndex(new Date(2025, 0, 2)); // week 0 -> base false
    const wk1 = getWeekIndex(new Date(2025, 0, 9)); // week 1 -> base true
    expect(resolveHasRecycle(wk0, [])).toBe(isRecycleWeek(wk0));
    expect(resolveHasRecycle(wk1, [])).toBe(isRecycleWeek(wk1));
  });

  it("ignores an override whose effectiveDate is after the queried date", () => {
    const shifts: RecycleShiftDelta[] = [{ effectiveDate: "2025-01-16", hasRecycle: true }];
    const wk0 = getWeekIndex(new Date(2025, 0, 2));
    expect(resolveHasRecycle(wk0, shifts)).toBe(isRecycleWeek(wk0));
  });

  it("applies an override on its own week, then keeps alternating from there", () => {
    // wk0 (Jan 2) is base-false; force it true starting Jan 2.
    const shifts: RecycleShiftDelta[] = [{ effectiveDate: "2025-01-02", hasRecycle: true }];
    const wk0 = getWeekIndex(new Date(2025, 0, 2));
    expect(isRecycleWeek(wk0)).toBe(false);
    expect(resolveHasRecycle(wk0, shifts)).toBe(true);
    // The following week must flip back — the override re-anchors the
    // alternation, it does not freeze every future week to the same value.
    const wk1 = getWeekIndex(new Date(2025, 0, 9));
    expect(resolveHasRecycle(wk1, shifts)).toBe(false);
    // And it flips again the week after that.
    const wk2 = getWeekIndex(new Date(2025, 0, 16));
    expect(resolveHasRecycle(wk2, shifts)).toBe(true);
  });

  it("uses the most recent applicable override when several are recorded", () => {
    const shifts: RecycleShiftDelta[] = [
      { effectiveDate: "2025-01-02", hasRecycle: true },
      { effectiveDate: "2025-01-23", hasRecycle: false },
    ];
    const between = getWeekIndex(new Date(2025, 0, 16)); // re-anchored from Jan 2 (true), 2 weeks later -> true
    const after = getWeekIndex(new Date(2025, 0, 23)); // second override's own week -> false
    const afterNext = getWeekIndex(new Date(2025, 0, 30)); // alternates again from the second anchor -> true
    expect(resolveHasRecycle(between, shifts)).toBe(true);
    expect(resolveHasRecycle(after, shifts)).toBe(false);
    expect(resolveHasRecycle(afterNext, shifts)).toBe(true);
  });
});

describe("recordRecycleShift propagates forward without touching history", () => {
  it("a shift recorded for next Thursday changes that week's trash assignment recycle flag without needing a code change elsewhere", async () => {
    await prisma.recycleShift.deleteMany();

    const today = new Date();
    const daysUntilThursday = (4 - today.getDay() + 7) % 7;
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
    nextThursday.setHours(0, 0, 0, 0);

    const before = await getRotationScheduleSource("TRASH_DISHES");
    const beforeAssignment = getTrashAssignment(nextThursday, before);

    await recordRecycleShift({
      effectiveDate: nextThursday,
      hasRecycle: !beforeAssignment.hasRecycle,
      actorUserId: adminUserId,
      reason: "regression test",
    });

    const after = await getRotationScheduleSource("TRASH_DISHES");
    const afterAssignment = getTrashAssignment(nextThursday, after);

    expect(afterAssignment.hasRecycle).toBe(!beforeAssignment.hasRecycle);
  });

  it("rejects a past effectiveDate", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await expect(
      recordRecycleShift({ effectiveDate: yesterday, hasRecycle: true, actorUserId: adminUserId })
    ).rejects.toThrow(/past/);
  });

  it("rejects a non-Thursday effectiveDate", async () => {
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    await expect(
      recordRecycleShift({ effectiveDate: nextFriday, hasRecycle: true, actorUserId: adminUserId })
    ).rejects.toThrow(/Thursday/);
  });
});

describe("previewRecycleShift", () => {
  it("shows before/after diverging only from the hypothetical effectiveDate onward", async () => {
    await prisma.recycleShift.deleteMany();

    const today = new Date();
    const daysUntilThursday = (4 - today.getDay() + 7) % 7;
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));

    const wk = getWeekIndex(nextThursday);
    const baseline = isRecycleWeek(wk);

    const preview = await previewRecycleShift(nextThursday, !baseline, 3);
    expect(preview.occurrences).toHaveLength(3);
    expect(preview.occurrences[0].before).toBe(baseline);
    expect(preview.occurrences[0].after).toBe(!baseline);
    // The week after the hypothetical override must flip back to `baseline`
    // under "after" — proves the override re-anchors the alternation instead
    // of pinning every future week to a constant value.
    expect(preview.occurrences[1].before).toBe(isRecycleWeek(wk + 1));
    expect(preview.occurrences[1].after).toBe(baseline);
  });
});
