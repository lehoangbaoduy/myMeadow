import { describe, it, expect } from "vitest";
import {
  getWeekIndex,
  getThursdayOfWeek,
  getFridayOfWeek,
  isRecycleWeek,
  getThursdaysInMonth,
  getFridaysInMonth,
  getBathroomDatesInMonth,
  bathroomOccurrenceIndexFromParts,
} from "@/lib/rotation-core";

describe("getWeekIndex", () => {
  // Rotation "weeks" are Thursday-anchored cycles (Thu through the following
  // Wed), not Sun-Sat calendar weeks — matches the household's actual trash
  // pickup cadence. A date rolls back to the most recent Thursday on/before it.
  it("returns 0 for the anchor Thursday and the Friday immediately after it (same cycle)", () => {
    expect(getWeekIndex(new Date(2025, 0, 2))).toBe(0); // Thursday
    expect(getWeekIndex(new Date(2025, 0, 3))).toBe(0); // Friday, same trash/dishes cycle
  });

  it("a Wednesday belongs to the PRECEDING Thursday's cycle, not the upcoming one", () => {
    expect(getWeekIndex(new Date(2025, 0, 1))).toBe(-1); // day before the anchor Thursday
  });

  it("advances by 1 for the following week and matches for trash's Thursday and dishes' Friday", () => {
    expect(getWeekIndex(new Date(2025, 0, 9))).toBe(1);
    expect(getWeekIndex(new Date(2025, 0, 10))).toBe(1);
  });

  it("is negative before the anchor", () => {
    expect(getWeekIndex(new Date(2024, 11, 26))).toBe(-1);
  });
});

describe("getThursdayOfWeek / getFridayOfWeek", () => {
  it("rolls forward to the same week's Thursday/Friday", () => {
    const thursday = getThursdayOfWeek(new Date(2025, 0, 1));
    const friday = getFridayOfWeek(new Date(2025, 0, 1));
    expect(thursday.getDay()).toBe(4);
    expect(thursday.getDate()).toBe(2);
    expect(friday.getDay()).toBe(5);
    expect(friday.getDate()).toBe(3);
  });
});

describe("isRecycleWeek (canonical rule post-fix)", () => {
  it("the anchor week (index 0) is NOT a recycle week", () => {
    expect(isRecycleWeek(0)).toBe(false);
  });

  it("alternates every week", () => {
    expect(isRecycleWeek(1)).toBe(true);
    expect(isRecycleWeek(2)).toBe(false);
    expect(isRecycleWeek(3)).toBe(true);
  });

  it("handles negative indices consistently", () => {
    expect(isRecycleWeek(-1)).toBe(true);
    expect(isRecycleWeek(-2)).toBe(false);
  });
});

describe("getThursdaysInMonth / getFridaysInMonth", () => {
  it("finds all Thursdays in January 2025", () => {
    expect(getThursdaysInMonth(2025, 0).map((d) => d.getDate())).toEqual([2, 9, 16, 23, 30]);
  });

  it("finds all Fridays in February 2025", () => {
    expect(getFridaysInMonth(2025, 1).map((d) => d.getDate())).toEqual([7, 14, 21, 28]);
  });
});

describe("getBathroomDatesInMonth", () => {
  it("returns the 1st and 15th", () => {
    const dates = getBathroomDatesInMonth(2025, 2);
    expect(dates.map((d) => d.getDate())).toEqual([1, 15]);
  });
});

describe("bathroomOccurrenceIndexFromParts", () => {
  it("gives the 1st and 15th of the same month consecutive indices", () => {
    const first = bathroomOccurrenceIndexFromParts(2025, 0, 1);
    const fifteenth = bathroomOccurrenceIndexFromParts(2025, 0, 15);
    expect(fifteenth).toBe(first + 1);
  });

  it("advances by 2 across a full month", () => {
    const janFirst = bathroomOccurrenceIndexFromParts(2025, 0, 1);
    const febFirst = bathroomOccurrenceIndexFromParts(2025, 1, 1);
    expect(febFirst).toBe(janFirst + 2);
  });

  it("treats any day 1-14 as occurrence 0 and 15-31 as occurrence 1 for that month", () => {
    const base = bathroomOccurrenceIndexFromParts(2025, 5, 1);
    expect(bathroomOccurrenceIndexFromParts(2025, 5, 14)).toBe(base);
    expect(bathroomOccurrenceIndexFromParts(2025, 5, 15)).toBe(base + 1);
    expect(bathroomOccurrenceIndexFromParts(2025, 5, 30)).toBe(base + 1);
  });

  it("carries correctly across a year boundary", () => {
    const dec15_2025 = bathroomOccurrenceIndexFromParts(2025, 11, 15);
    const jan1_2026 = bathroomOccurrenceIndexFromParts(2026, 0, 1);
    expect(jan1_2026).toBe(dec15_2025 + 1);
  });
});
