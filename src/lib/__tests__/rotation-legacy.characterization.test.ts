import { describe, it, expect } from "vitest";
import {
  getWeekIndex as getTrashWeekIndex,
  getThursdayOfWeek,
  getThursdaysInMonth,
  generateSchedule as generateTrashSchedule,
} from "@/lib/trash-schedule";
import {
  getWeekIndex as getDishesWeekIndex,
  getFridayOfWeek,
  getFridaysInMonth,
  generateSchedule as generateDishesSchedule,
} from "@/lib/dishes-schedule";
import {
  getTrashAssignment,
  getBathroomAssignment,
  getDishesAssignment,
} from "@/lib/rotation-assignments";

/**
 * Characterization tests for the rotation logic BEFORE the rotation-engine
 * refactor. These pin today's actual behavior (bugs included) so the
 * refactor can be verified not to silently change anything except the
 * one documented fix (recycle-week parity).
 */

describe("trash-schedule week index (anchor: Thursday Jan 2 2025)", () => {
  it("returns 0 for the anchor week", () => {
    expect(getTrashWeekIndex(new Date(2025, 0, 2))).toBe(0);
  });

  it("returns 1 for the following Thursday", () => {
    expect(getTrashWeekIndex(new Date(2025, 0, 9))).toBe(1);
  });

  it("returns -1 for the preceding Thursday", () => {
    expect(getTrashWeekIndex(new Date(2024, 11, 26))).toBe(-1);
  });
});

describe("dishes-schedule week index (anchor: Friday Jan 3 2025)", () => {
  it("returns 0 for the anchor week", () => {
    expect(getDishesWeekIndex(new Date(2025, 0, 3))).toBe(0);
  });

  it("agrees numerically with the trash week index for the same calendar week", () => {
    // Thursday Jan 2 2025 and Friday Jan 3 2025 are the same calendar week.
    expect(getDishesWeekIndex(new Date(2025, 0, 3))).toBe(
      getTrashWeekIndex(new Date(2025, 0, 2))
    );
    expect(getDishesWeekIndex(new Date(2025, 1, 7))).toBe(
      getTrashWeekIndex(new Date(2025, 1, 6))
    );
  });
});

describe("getThursdayOfWeek / getFridayOfWeek", () => {
  it("rolls a mid-week date forward to that week's Thursday", () => {
    const d = getThursdayOfWeek(new Date(2025, 0, 1)); // Wednesday
    expect(d.getDay()).toBe(4);
    expect(d.getDate()).toBe(2);
  });

  it("rolls a mid-week date forward to that week's Friday", () => {
    const d = getFridayOfWeek(new Date(2025, 0, 1)); // Wednesday
    expect(d.getDay()).toBe(5);
    expect(d.getDate()).toBe(3);
  });
});

describe("getThursdaysInMonth / getFridaysInMonth", () => {
  it("finds all 5 Thursdays in January 2025", () => {
    const thursdays = getThursdaysInMonth(2025, 0);
    expect(thursdays).toHaveLength(5);
    expect(thursdays.map((d) => d.getDate())).toEqual([2, 9, 16, 23, 30]);
  });

  it("finds all 4 Fridays in February 2025", () => {
    const fridays = getFridaysInMonth(2025, 1);
    expect(fridays).toHaveLength(4);
    expect(fridays.map((d) => d.getDate())).toEqual([7, 14, 21, 28]);
  });
});

describe("generateSchedule rotation assignment (modulo over tenant list)", () => {
  const tenants = ["Bao", "Cuong", "Khoa"];

  it("assigns tenants in order across consecutive weeks", () => {
    const thursdays = getThursdaysInMonth(2025, 0); // 5 Thursdays
    const schedule = generateTrashSchedule(thursdays, tenants);
    expect(schedule.map((e) => e.tenantName)).toEqual([
      "Bao",
      "Cuong",
      "Khoa",
      "Bao",
      "Cuong",
    ]);
  });

  it("returns an empty schedule when there are no tenants", () => {
    const thursdays = getThursdaysInMonth(2025, 0);
    expect(generateTrashSchedule(thursdays, [])).toEqual([]);
    expect(generateDishesSchedule(getFridaysInMonth(2025, 0), [])).toEqual([]);
  });
});

describe("FIXED: recycle-week parity now agrees between call sites", () => {
  // Was: trash-schedule.ts used weekIdx % 2 !== 0, rotation-assignments.ts used
  // weekIdx % 2 === 0 — opposite rules, confirmed disagreeing for every week.
  // rotation-core.ts now unifies both onto trash-schedule.ts's rule
  // (isRecycleWeek), and rotation-assignments.ts delegates to it.
  const roster = [{ label: "Bao", members: ["Bao"] }];

  it("trash-schedule.ts marks the anchor week (weekIdx 0) as NOT a recycle week", () => {
    const thursdays = [new Date(2025, 0, 2)];
    const schedule = generateTrashSchedule(thursdays, ["Bao"]);
    expect(schedule[0].hasRecycle).toBe(false);
  });

  it("rotation-assignments.ts also marks the anchor week (weekIdx 0) as NOT a recycle week", () => {
    const { hasRecycle } = getTrashAssignment(new Date(2025, 0, 2), roster);
    expect(hasRecycle).toBe(false);
  });

  it("the two call sites agree for the same date", () => {
    const date = new Date(2025, 0, 2);
    const fromSchedule = generateTrashSchedule([date], ["Bao"])[0].hasRecycle;
    const fromAssignment = getTrashAssignment(date, roster).hasRecycle;
    expect(fromSchedule).toBe(fromAssignment);
  });
});

describe("FIXED: rotation-assignments bathroom uses the true semimonthly (1st/15th) schedule", () => {
  // Was: Math.floor(weekIdx / 2) — a biweekly-by-week approximation that
  // drifted from actual 1st/15th calendar days. Now anchored to the real
  // semimonthly occurrence index (bathroomOccurrenceIndexFromParts).
  const bathroomRoster = [
    { label: "Ngan", members: ["Ngan"] },
    { label: "Nhi", members: ["Nhi"] },
    { label: "Thao", members: ["Thao"] },
  ];

  it("assigns the same person for the whole 1st-14th window, then advances on the 15th", () => {
    const first = getBathroomAssignment(new Date(2025, 0, 1), bathroomRoster);
    const midWindow = getBathroomAssignment(new Date(2025, 0, 10), bathroomRoster);
    const fifteenth = getBathroomAssignment(new Date(2025, 0, 15), bathroomRoster);
    expect(first).toBe(midWindow);
    expect(fifteenth).not.toBe(first);
  });
});

describe("getDishesAssignment", () => {
  it("matches generateDishesSchedule's rotation for the same tenants/date", () => {
    const friday = new Date(2025, 0, 3);
    const tenants = ["Ngan", "Nhi", "Thao"];
    const roster = tenants.map((name) => ({ label: name, members: [name] }));
    const viaAssignment = getDishesAssignment(friday, roster);
    const viaSchedule = generateDishesSchedule([friday], tenants)[0].tenantName;
    expect(viaAssignment).toBe(viaSchedule);
  });
});
