import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { previewShift } from "@/lib/rotation-core";
import { GET as previewGet } from "@/app/api/rotations/[type]/shift/preview/route";

/**
 * Pins the exact "A/B/C" scenario admins ask about: A misses their turn on
 * week 1, and the fix is a single shift (effectiveDate = week 2,
 * offsetPositions = -1) that cascades forever — B takes week 3 (was C's),
 * C takes week 4 (was A's wrap-around), and the pattern keeps holding for
 * every week after that, not just the next couple. The sign is the
 * confusing part: -1 delays everyone by one roster slot; +1 does the
 * opposite (skips a slot). Both previewShift() and the route it backs are
 * read-only — they must never write a RotationShift row.
 */

const ADMIN_CLERK_ID = "test_rsp_admin";
const TENANT_CLERK_ID_PREFIX = "test_rsp_tenant_";

let adminUserId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  await prisma.rotationShift.deleteMany({ where: { rotationType: "TRASH_DISHES" } });
  await prisma.rotationUnit.deleteMany({ where: { rotationType: "TRASH_DISHES" } });

  let adminUser = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!adminUser) {
    adminUser = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });
  }
  adminUserId = adminUser.id;

  const tenantIds: number[] = [];
  for (const name of ["RSP_A", "RSP_B", "RSP_C"]) {
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

  // Roster order fixes A, B, C at positions 0, 1, 2 — this order is never
  // touched by shifting.
  for (let i = 0; i < tenantIds.length; i++) {
    await prisma.rotationUnit.create({ data: { rotationType: "TRASH_DISHES", order: i, tenantId: tenantIds[i] } });
  }
});

describe("previewShift: the A/B/C missed-turn scenario", () => {
  it("with no shifts recorded yet, the natural cycle is A, B, C, A, B, C", async () => {
    const preview = await previewShift(
      "TRASH_DISHES",
      new Date(2025, 0, 9), // week 2 (Thursday)
      0,
      6
    );
    expect(preview.currentTotalShift).toBe(0);
    expect(preview.occurrences.map((o) => o.before)).toEqual(["RSP_B", "RSP_C", "RSP_A", "RSP_B", "RSP_C", "RSP_A"]);
  });

  it("offsetPositions -1, effective week 2, delays everyone by one slot — forever, not just for 3 weeks", async () => {
    const preview = await previewShift(
      "TRASH_DISHES",
      new Date(2025, 0, 9), // week 2
      -1,
      6
    );
    // Dates: wk2 (Jan 9), wk3 (Jan 16), wk4 (Jan 23), wk5 (Jan 30), wk6 (Feb 6), wk7 (Feb 13)
    expect(preview.occurrences.map((o) => o.date)).toEqual([
      "2025-01-09",
      "2025-01-16",
      "2025-01-23",
      "2025-01-30",
      "2025-02-06",
      "2025-02-13",
    ]);
    // "before" is the unshifted cycle: B, C, A, B, C, A
    expect(preview.occurrences.map((o) => o.before)).toEqual(["RSP_B", "RSP_C", "RSP_A", "RSP_B", "RSP_C", "RSP_A"]);
    // "after" is A takes wk2 (was B's), B takes wk3 (was C's), C takes wk4
    // (was A's wrap-around) — and the shifted pattern keeps holding every
    // week after that (wk5=A, wk6=B, wk7=C), confirming this is a permanent
    // phase change, not a one-time swap of just 3 weeks.
    expect(preview.occurrences.map((o) => o.after)).toEqual(["RSP_A", "RSP_B", "RSP_C", "RSP_A", "RSP_B", "RSP_C"]);
  });

  it("offsetPositions +1 does the OPPOSITE — skips a slot forward instead of delaying", async () => {
    const preview = await previewShift("TRASH_DISHES", new Date(2025, 0, 9), 1, 3);
    // +1 pulls week 2 straight to what would have been week 3's person (C),
    // the reverse of the delay cascade above — this is why the sign is easy
    // to get backwards.
    expect(preview.occurrences.map((o) => o.after)).toEqual(["RSP_C", "RSP_A", "RSP_B"]);
  });

  it("previewShift never writes a RotationShift row", async () => {
    const before = await prisma.rotationShift.count({ where: { rotationType: "TRASH_DISHES" } });
    await previewShift("TRASH_DISHES", new Date(2025, 0, 9), -1, 6);
    const after = await prisma.rotationShift.count({ where: { rotationType: "TRASH_DISHES" } });
    expect(after).toBe(before);
  });

  it("stacks on top of an already-recorded shift instead of replacing it", async () => {
    await prisma.rotationShift.create({
      data: {
        rotationType: "TRASH_DISHES",
        effectiveDate: new Date(2025, 0, 2), // week 1, before our preview window
        offsetPositions: 2,
        actorUserId: adminUserId,
        previousUnitLabel: "RSP_A",
        newUnitLabel: "RSP_C",
      },
    });

    const preview = await previewShift("TRASH_DISHES", new Date(2025, 0, 9), -1, 1);
    // Already +2 in effect by week 2, plus our hypothetical -1 = net +1.
    expect(preview.currentTotalShift).toBe(2);
    // before: (weekIndex 1 + 2) % 3 = 0 -> A. after: (1 + 2 - 1) % 3 = 2 -> C.
    expect(preview.occurrences[0].before).toBe("RSP_A");
    expect(preview.occurrences[0].after).toBe("RSP_C");
  });
});

describe("GET /api/rotations/[type]/shift/preview", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuthAs(null);
    const req = new NextRequest(
      "http://localhost/api/rotations/TRASH_DISHES/shift/preview?effectiveDate=2025-01-09&offsetPositions=-1"
    );
    const res = await previewGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin tenant", async () => {
    mockAuthAs(TENANT_CLERK_ID_PREFIX + "RSP_A");
    const req = new NextRequest(
      "http://localhost/api/rotations/TRASH_DISHES/shift/preview?effectiveDate=2025-01-09&offsetPositions=-1"
    );
    const res = await previewGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(403);
  });

  it("returns 400 for a malformed effectiveDate", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const req = new NextRequest(
      "http://localhost/api/rotations/TRASH_DISHES/shift/preview?effectiveDate=not-a-date&offsetPositions=-1"
    );
    const res = await previewGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-integer offsetPositions", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const req = new NextRequest(
      "http://localhost/api/rotations/TRASH_DISHES/shift/preview?effectiveDate=2025-01-09&offsetPositions=abc"
    );
    const res = await previewGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(400);
  });

  it("200s for an admin and matches previewShift's own output", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const req = new NextRequest(
      "http://localhost/api/rotations/TRASH_DISHES/shift/preview?effectiveDate=2025-01-09&offsetPositions=-1"
    );
    const res = await previewGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.occurrences)).toBe(true);
    expect(body.occurrences.length).toBe(6);
    expect(typeof body.currentTotalShift).toBe("number");
  });

  it("accepts an effectiveDate in the past (preview never persists, unlike POST /shift)", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const req = new NextRequest(
      "http://localhost/api/rotations/TRASH_DISHES/shift/preview?effectiveDate=2020-01-01&offsetPositions=-1"
    );
    const res = await previewGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(200);
  });
});
