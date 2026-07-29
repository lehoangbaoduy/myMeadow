import { describe, it, expect } from "vitest";
import { isActiveForPeriod } from "@/lib/resident-activity";

describe("isActiveForPeriod", () => {
  const jan2026 = new Date(2026, 0, 1);

  it("currently active residents always count, regardless of deactivatedAt", () => {
    expect(isActiveForPeriod({ isActive: true, deactivatedAt: null }, jan2026)).toBe(true);
    expect(isActiveForPeriod({ isActive: true, deactivatedAt: new Date(2020, 0, 1) }, jan2026)).toBe(true);
  });

  it("deactivated with no recorded date counts as active for any past period", () => {
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: null }, jan2026)).toBe(true);
  });

  it("counts for the period if deactivated on/after that period's first day", () => {
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: new Date(2026, 0, 1) }, jan2026)).toBe(true);
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: new Date(2026, 0, 15) }, jan2026)).toBe(true);
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: new Date(2026, 1, 1) }, jan2026)).toBe(true);
  });

  it("excludes a resident deactivated before the period started", () => {
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: new Date(2025, 11, 31) }, jan2026)).toBe(false);
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: new Date(2025, 5, 1) }, jan2026)).toBe(false);
  });

  it("accepts a string date, matching what a serialized API response provides", () => {
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: "2026-01-10" }, jan2026)).toBe(true);
    expect(isActiveForPeriod({ isActive: false, deactivatedAt: "2025-12-01" }, jan2026)).toBe(false);
  });
});
