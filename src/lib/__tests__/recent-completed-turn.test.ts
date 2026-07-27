import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getMostRecentCompletedTurn } from "@/lib/recent-completed-turn";

const ADMIN_CLERK_ID = "test_rct_admin";
const TENANT_CLERK_ID = "test_rct_tenant";

let unitId: number;

beforeAll(async () => {
  await prisma.trashAssignment.deleteMany({ where: { deletedUnitLabel: "TestRCT Tenant" } });
  await prisma.dishesAssignment.deleteMany({ where: { deletedUnitLabel: "TestRCT Tenant" } });
  await prisma.bathroomAssignment.deleteMany({ where: { deletedUnitLabel: "TestRCT Tenant" } });
  await prisma.rotationUnit.deleteMany({ where: { rotationType: "TRASH_DISHES", order: 999 } });

  let admin = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!admin) admin = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });

  let tenantUser = await prisma.user.findUnique({ where: { clerkId: TENANT_CLERK_ID } });
  if (!tenantUser) tenantUser = await prisma.user.create({ data: { clerkId: TENANT_CLERK_ID, role: "TENANT", registrationComplete: true } });

  let tenant = await prisma.tenant.findFirst({ where: { userId: tenantUser.id } });
  if (!tenant) tenant = await prisma.tenant.create({ data: { name: "TestRCT Tenant", gender: "MALE", userId: tenantUser.id, isActive: true } });

  let unit = await prisma.rotationUnit.findFirst({ where: { rotationType: "TRASH_DISHES", tenantId: tenant.id } });
  if (!unit) unit = await prisma.rotationUnit.create({ data: { rotationType: "TRASH_DISHES", order: 999, tenantId: tenant.id } });
  unitId = unit.id;
});

describe("getMostRecentCompletedTurn", () => {
  // Other integration test files (e.g. rotation-admin-routes.test.ts's
  // occurrence-completion tests) also write COMPLETED rows with
  // completedAt: new Date() against this same shared local DB. Fixed
  // historical dates would be beaten by those "real now" timestamps, so
  // these tests anchor to Date.now() + an increasing offset to guarantee
  // their own rows are the most recent regardless of run order.
  it("returns the most recently completed row across all three chore tables", async () => {
    const older = new Date(Date.now() + 10_000);
    const newer = new Date(Date.now() + 20_000);

    await prisma.trashAssignment.create({
      data: { date: new Date("2026-01-01"), unitId, status: "COMPLETED", completedAt: older },
    });
    await prisma.dishesAssignment.create({
      data: { date: new Date("2026-02-01"), unitId, status: "COMPLETED", completedAt: newer },
    });

    const result = await getMostRecentCompletedTurn();
    expect(result).not.toBeNull();
    expect(result!.choreTable).toBe("DISHES");
    expect(result!.label).toBe("TestRCT Tenant");
  });

  it("falls back to deletedUnitLabel when unitId is null", async () => {
    await prisma.bathroomAssignment.deleteMany({ where: { unitId } });
    await prisma.bathroomAssignment.create({
      data: {
        date: new Date("2026-03-01"),
        unitId: null,
        deletedUnitLabel: "Someone Who Left",
        status: "COMPLETED",
        completedAt: new Date(Date.now() + 30_000),
      },
    });

    const result = await getMostRecentCompletedTurn();
    expect(result!.choreTable).toBe("BATHROOM");
    expect(result!.label).toBe("Someone Who Left");
  });

  // Note: an "empty database → null" case is intentionally not tested here.
  // This suite shares a single local SQLite file with every other integration
  // test (see rotation-admin-routes.test.ts's occurrence-completion tests),
  // so asserting a global "nothing is COMPLETED anywhere" state would be
  // flaky by construction. The null branch (`candidates.length === 0`) is a
  // one-line guard directly readable in recent-completed-turn.ts.
});
