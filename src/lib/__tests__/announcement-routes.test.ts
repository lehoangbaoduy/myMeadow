import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as listGet, POST as listPost } from "@/app/api/announcements/route";
import { PUT as itemPut, DELETE as itemDelete } from "@/app/api/announcements/[id]/route";
import { POST as clearPost, DELETE as clearDelete } from "@/app/api/announcements/[id]/clear/route";

/** Integration tests against the real local SQLite database (see rotation-admin-routes.test.ts). */

const ADMIN_CLERK_ID = "test_ann_admin";
const TENANT_A_CLERK_ID = "test_ann_tenant_a";
const TENANT_B_CLERK_ID = "test_ann_tenant_b";

let adminUserId: number;
let tenantAUserId: number;
let tenantBUserId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

function makeReq(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeAll(async () => {
  await prisma.announcementRecipient.deleteMany({});
  await prisma.announcement.deleteMany({ where: { title: { startsWith: "TestAnn:" } } });

  let admin = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!admin) admin = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });
  adminUserId = admin.id;

  let tenantA = await prisma.user.findUnique({ where: { clerkId: TENANT_A_CLERK_ID } });
  if (!tenantA) tenantA = await prisma.user.create({ data: { clerkId: TENANT_A_CLERK_ID, role: "TENANT", registrationComplete: true } });
  tenantAUserId = tenantA.id;

  let tenantB = await prisma.user.findUnique({ where: { clerkId: TENANT_B_CLERK_ID } });
  if (!tenantB) tenantB = await prisma.user.create({ data: { clerkId: TENANT_B_CLERK_ID, role: "TENANT", registrationComplete: true } });
  tenantBUserId = tenantB.id;
});

describe("announcements: history + per-user clearing", () => {
  it("admin can create an announcement", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const req = makeReq("http://localhost/api/announcements", "POST", {
      title: "TestAnn: Water shutoff",
      description: "Water will be off Tuesday",
      date: new Date().toISOString(),
    });
    const res = await listPost(req);
    expect(res.status).toBe(201);
  });

  it("non-admin cannot create an announcement", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = makeReq("http://localhost/api/announcements", "POST", {
      title: "TestAnn: Should fail",
      description: "x",
      date: new Date().toISOString(),
    });
    const res = await listPost(req);
    expect(res.status).toBe(403);
  });

  it("GET shows ACTIVE by default for a tenant who hasn't cleared it", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const res = await listGet();
    const items = await res.json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");
    expect(item.effectiveStatus).toBe("ACTIVE");
    expect(item.creatorName).not.toBeNull();
  });

  it("tenant A clearing it makes it CLEARED for tenant A but not tenant B", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const listRes = await listGet();
    const items = await listRes.json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");

    const clearRes = await clearPost(makeReq(`http://localhost/api/announcements/${item.id}/clear`, "POST", {}), {
      params: { id: String(item.id) },
    });
    expect(clearRes.status).toBe(200);

    const afterA = await (await listGet()).json();
    expect(afterA.find((i: { id: number }) => i.id === item.id).effectiveStatus).toBe("CLEARED");

    mockAuthAs(TENANT_B_CLERK_ID);
    const afterB = await (await listGet()).json();
    expect(afterB.find((i: { id: number }) => i.id === item.id).effectiveStatus).toBe("ACTIVE");
  });

  it("tenant A can restore (un-clear) it for themselves", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const listRes = await listGet();
    const items = await listRes.json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");

    const res = await clearDelete(makeReq(`http://localhost/api/announcements/${item.id}/clear`, "DELETE", {}), {
      params: { id: String(item.id) },
    });
    expect(res.status).toBe(200);

    const after = await (await listGet()).json();
    expect(after.find((i: { id: number }) => i.id === item.id).effectiveStatus).toBe("ACTIVE");
  });

  it("non-admin cannot clear on behalf of another user (403)", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const items = await (await listGet()).json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");

    const res = await clearPost(
      makeReq(`http://localhost/api/announcements/${item.id}/clear`, "POST", { userId: tenantBUserId }),
      { params: { id: String(item.id) } }
    );
    expect(res.status).toBe(403);
  });

  it("admin can clear on behalf of another user", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const items = await (await listGet()).json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");

    const res = await clearPost(
      makeReq(`http://localhost/api/announcements/${item.id}/clear`, "POST", { userId: tenantBUserId }),
      { params: { id: String(item.id) } }
    );
    expect(res.status).toBe(200);

    mockAuthAs(TENANT_B_CLERK_ID);
    const afterB = await (await listGet()).json();
    expect(afterB.find((i: { id: number }) => i.id === item.id).effectiveStatus).toBe("CLEARED");

    // restore for the next test
    await clearDelete(makeReq(`http://localhost/api/announcements/${item.id}/clear`, "DELETE", {}), {
      params: { id: String(item.id) },
    });
  });

  it("non-admin cannot archive an announcement (403)", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const items = await (await listGet()).json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");
    const res = await itemDelete(makeReq(`http://localhost/api/announcements/${item.id}`, "DELETE"), {
      params: { id: String(item.id) },
    });
    expect(res.status).toBe(403);
  });

  it("admin archiving takes priority over a tenant's cleared state (ARCHIVED wins)", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const items = await (await listGet()).json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");
    await clearPost(makeReq(`http://localhost/api/announcements/${item.id}/clear`, "POST", {}), {
      params: { id: String(item.id) },
    });

    mockAuthAs(ADMIN_CLERK_ID);
    const archiveRes = await itemDelete(makeReq(`http://localhost/api/announcements/${item.id}`, "DELETE"), {
      params: { id: String(item.id) },
    });
    expect(archiveRes.status).toBe(200);

    mockAuthAs(TENANT_A_CLERK_ID);
    const after = await (await listGet()).json();
    expect(after.find((i: { id: number }) => i.id === item.id).effectiveStatus).toBe("ARCHIVED");
  });

  it("admin can unarchive via PUT status: ACTIVE", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const items = await (await listGet()).json();
    const item = items.find((i: { title: string }) => i.title === "TestAnn: Water shutoff");

    const res = await itemPut(makeReq(`http://localhost/api/announcements/${item.id}`, "PUT", { status: "ACTIVE" }), {
      params: { id: String(item.id) },
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe("ACTIVE");
  });

  it("an expired announcement shows EXPIRED even if cleared (EXPIRED beats CLEARED)", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const createRes = await listPost(
      makeReq("http://localhost/api/announcements", "POST", {
        title: "TestAnn: Expired one",
        description: "old news",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
    );
    const created = await createRes.json();

    mockAuthAs(TENANT_A_CLERK_ID);
    await clearPost(makeReq(`http://localhost/api/announcements/${created.id}/clear`, "POST", {}), {
      params: { id: String(created.id) },
    });
    const after = await (await listGet()).json();
    expect(after.find((i: { id: number }) => i.id === created.id).effectiveStatus).toBe("EXPIRED");
  });
});
