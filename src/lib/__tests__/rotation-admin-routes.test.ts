import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as rosterGet, PUT as rosterPut } from "@/app/api/rotations/[type]/roster/route";
import { POST as teamsPost, DELETE as teamsDelete } from "@/app/api/rotations/[type]/teams/route";
import { POST as shiftPost } from "@/app/api/rotations/[type]/shift/route";
import { POST as completePost } from "@/app/api/rotations/[type]/occurrences/[date]/complete/route";

/**
 * Integration tests against a real (local, scratch) SQLite database — the
 * rotation admin routes are almost entirely DB read/write logic (roster
 * reordering under a unique constraint, team creation transactions, shift
 * bookkeeping), which pure unit tests of date math can't exercise. Runs
 * against prisma/dev.db, which `src/lib/prisma.ts` falls back to whenever
 * TURSO_DATABASE_URL is unset (as it is under `vitest run`) — never touches
 * the Turso production database.
 */

const ADMIN_CLERK_ID = "test_admin";
const TENANT_CLERK_ID_PREFIX = "test_tenant_";

let tenantIds: number[] = [];

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  await prisma.rotationUnit.deleteMany({});
  await prisma.rotationTeamMember.deleteMany({});
  await prisma.rotationTeam.deleteMany({});
  await prisma.rotationShift.deleteMany({});
  await prisma.trashAssignment.deleteMany({});
  await prisma.dishesAssignment.deleteMany({});
  await prisma.bathroomAssignment.deleteMany({});

  let adminUser = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true },
    });
  }

  tenantIds = [];
  for (const name of ["TestA", "TestB", "TestC"]) {
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
});

describe("rotation admin routes: auth gating", () => {
  it("roster GET returns 401 when unauthenticated", async () => {
    mockAuthAs(null);
    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster");
    const res = await rosterGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(401);
  });

  it("roster GET returns 403 for a non-admin tenant", async () => {
    mockAuthAs(TENANT_CLERK_ID_PREFIX + "TestA");
    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster");
    const res = await rosterGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid rotation type before auth is checked", async () => {
    mockAuthAs(null);
    const req = new NextRequest("http://localhost/api/rotations/NOT_REAL/roster");
    const res = await rosterGet(req, { params: { type: "NOT_REAL" } });
    expect(res.status).toBe(400);
  });
});

describe("rotation admin routes: roster CRUD", () => {
  beforeAll(() => mockAuthAs(ADMIN_CLERK_ID));

  it("starts empty", async () => {
    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster");
    const res = await rosterGet(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("adds solo tenants via PUT and orders them as given", async () => {
    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster", {
      method: "PUT",
      body: JSON.stringify({ units: [{ tenantId: tenantIds[0] }, { tenantId: tenantIds[1] }] }),
    });
    const res = await rosterPut(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((u: { tenantId: number }) => u.tenantId)).toEqual([tenantIds[0], tenantIds[1]]);
  });

  it("rejects re-adding a tenant already on the roster", async () => {
    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster", {
      method: "PUT",
      body: JSON.stringify({ units: [{ tenantId: tenantIds[0] }, { tenantId: tenantIds[0] }] }),
    });
    const res = await rosterPut(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(400);
  });

  it("reorders existing units by unitId (exercises the two-phase order swap)", async () => {
    const getReq = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster");
    const current = await (await rosterGet(getReq, { params: { type: "TRASH_DISHES" } })).json();
    const [first, second] = current;

    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/roster", {
      method: "PUT",
      body: JSON.stringify({ units: [{ unitId: second.id }, { unitId: first.id }] }),
    });
    const res = await rosterPut(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((u: { id: number }) => u.id)).toEqual([second.id, first.id]);
  });
});

describe("rotation admin routes: teams", () => {
  beforeAll(() => mockAuthAs(ADMIN_CLERK_ID));

  it("rejects a team with fewer than 2 members", async () => {
    const req = new NextRequest("http://localhost/api/rotations/BATHROOM/teams", {
      method: "POST",
      body: JSON.stringify({ tenantIds: [tenantIds[2]] }),
    });
    const res = await teamsPost(req, { params: { type: "BATHROOM" } });
    expect(res.status).toBe(400);
  });

  it("creates a team and appends it as a roster unit", async () => {
    const req = new NextRequest("http://localhost/api/rotations/BATHROOM/teams", {
      method: "POST",
      body: JSON.stringify({ name: "Test Team", tenantIds: [tenantIds[1], tenantIds[2]] }),
    });
    const res = await teamsPost(req, { params: { type: "BATHROOM" } });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.teamId).toBeDefined();

    const getReq = new NextRequest("http://localhost/api/rotations/BATHROOM/roster");
    const roster = await (await rosterGet(getReq, { params: { type: "BATHROOM" } })).json();
    const teamUnit = roster.find((u: { teamId: number | null }) => u.teamId === body.teamId);
    expect(teamUnit).toBeDefined();
    expect(
      teamUnit.members.map((m: { tenantId: number }) => m.tenantId).sort()
    ).toEqual([tenantIds[1], tenantIds[2]].sort());
  });

  it("rejects a tenant joining a second team on the same rotation", async () => {
    const req = new NextRequest("http://localhost/api/rotations/BATHROOM/teams", {
      method: "POST",
      body: JSON.stringify({ tenantIds: [tenantIds[1], tenantIds[0]] }),
    });
    const res = await teamsPost(req, { params: { type: "BATHROOM" } });
    expect(res.status).toBe(400);
  });

  it("disbands a team and removes its roster unit", async () => {
    const listReq = new NextRequest("http://localhost/api/rotations/BATHROOM/roster");
    const roster = await (await rosterGet(listReq, { params: { type: "BATHROOM" } })).json();
    const teamUnit = roster.find((u: { teamId: number | null }) => u.teamId !== null);

    const req = new NextRequest("http://localhost/api/rotations/BATHROOM/teams", {
      method: "DELETE",
      body: JSON.stringify({ teamId: teamUnit.teamId }),
    });
    const res = await teamsDelete(req, { params: { type: "BATHROOM" } });
    expect(res.status).toBe(200);

    const after = await (await rosterGet(listReq, { params: { type: "BATHROOM" } })).json();
    expect(after.find((u: { id: number }) => u.id === teamUnit.id)).toBeUndefined();
  });
});

describe("rotation admin routes: shift", () => {
  beforeAll(() => mockAuthAs(ADMIN_CLERK_ID));

  it("rejects an effectiveDate in the past", async () => {
    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/shift", {
      method: "POST",
      body: JSON.stringify({ effectiveDate: "2020-01-01", offsetPositions: 1 }),
    });
    const res = await shiftPost(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(400);
  });

  it("records a shift with a real previous/new label change", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const dateStr = future.toISOString().split("T")[0];

    const req = new NextRequest("http://localhost/api/rotations/TRASH_DISHES/shift", {
      method: "POST",
      body: JSON.stringify({ effectiveDate: dateStr, offsetPositions: 1, reason: "test shift" }),
    });
    const res = await shiftPost(req, { params: { type: "TRASH_DISHES" } });
    expect(res.status).toBe(201);
    const body = await res.json();

    const shift = await prisma.rotationShift.findUnique({ where: { id: body.id } });
    expect(shift).not.toBeNull();
    expect(shift!.previousUnitLabel).not.toBe(shift!.newUnitLabel);
  });
});

describe("rotation admin routes: occurrence completion", () => {
  beforeAll(() => mockAuthAs(ADMIN_CLERK_ID));

  it("rejects a date that isn't a Thursday for TRASH", async () => {
    const req = new NextRequest("http://localhost/api/rotations/TRASH/occurrences/2025-01-01/complete", {
      method: "POST",
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const res = await completePost(req, { params: { type: "TRASH", date: "2025-01-01" } });
    expect(res.status).toBe(400);
  });

  it("marks a Thursday trash occurrence completed", async () => {
    const req = new NextRequest("http://localhost/api/rotations/TRASH/occurrences/2025-01-02/complete", {
      method: "POST",
      body: JSON.stringify({ status: "COMPLETED", notes: "done" }),
    });
    const res = await completePost(req, { params: { type: "TRASH", date: "2025-01-02" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("COMPLETED");
    expect(body.notes).toBe("done");
  });

  it("rejects a day that isn't the 1st or 15th for BATHROOM", async () => {
    const req = new NextRequest("http://localhost/api/rotations/BATHROOM/occurrences/2025-01-10/complete", {
      method: "POST",
      body: JSON.stringify({ status: "MISSED" }),
    });
    const res = await completePost(req, { params: { type: "BATHROOM", date: "2025-01-10" } });
    expect(res.status).toBe(400);
  });
});
