import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as listGet } from "@/app/api/inventory/route";
import { PATCH as itemPatch } from "@/app/api/inventory/[id]/route";
import { GET as historyGet } from "@/app/api/inventory/[id]/history/route";

/**
 * The kitchen/household inventory is shared unconditionally with everyone
 * (unlike personal inventory) — any resident can restock any item. What's
 * new here is attribution: only level INCREASES are logged as a restock
 * (see InventoryLevelLog in schema.prisma) — dragging the level down or a
 * run-out report is not "who filled it up" and must not appear in history.
 */

const TENANT_A_CLERK_ID = "test_kinv_tenant_a";
const TENANT_B_CLERK_ID = "test_kinv_tenant_b";

let itemId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  await prisma.inventoryItem.deleteMany({ where: { name: "Test Kitchen Item" } });

  for (const [clerkId, name] of [
    [TENANT_A_CLERK_ID, "KInvTenantA"],
    [TENANT_B_CLERK_ID, "KInvTenantB"],
  ] as const) {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({ data: { clerkId, role: "TENANT", registrationComplete: true } });
    }
    let tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name, gender: "MALE", userId: user.id, isActive: true } });
    }
  }

  const item = await prisma.inventoryItem.create({
    data: { name: "Test Kitchen Item", category: "Custom", isCustom: true, level: 0.2 },
  });
  itemId = item.id;
});

describe("kitchen inventory: restock attribution + history", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuthAs(null);
    const req = new NextRequest(`http://localhost/api/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ level: 0.5 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(401);
  });

  it("logs an increase with the caller's name and returns it on the PATCH response", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ level: 0.8 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lastRestock.name).toBe("KInvTenantA");
  });

  it("does NOT log a decrease — lastRestock still shows the prior filler", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ level: 0.3 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemId) } });
    const body = await res.json();
    expect(body.lastRestock.name).toBe("KInvTenantA");

    const historyReq = new NextRequest(`http://localhost/api/inventory/${itemId}/history`);
    const historyRes = await historyGet(historyReq, { params: { id: String(itemId) } });
    expect(await historyRes.json()).toHaveLength(1);
  });

  it("does NOT log an equal (unchanged) level", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ level: 0.3 }),
    });
    await itemPatch(req, { params: { id: String(itemId) } });

    const historyReq = new NextRequest(`http://localhost/api/inventory/${itemId}/history`);
    const historyRes = await historyGet(historyReq, { params: { id: String(itemId) } });
    expect(await historyRes.json()).toHaveLength(1);
  });

  it("a second restock by a different resident updates lastRestock to the newest filler (pins distinct+orderBy behavior)", async () => {
    mockAuthAs(TENANT_B_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ level: 1.0 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemId) } });
    const body = await res.json();
    expect(body.lastRestock.name).toBe("KInvTenantB");

    const listRes = await listGet();
    const items: { id: number; lastRestock: { name: string } | null }[] = await listRes.json();
    const found = items.find((i) => i.id === itemId);
    expect(found?.lastRestock?.name).toBe("KInvTenantB");
  });

  it("history endpoint returns entries newest-first", async () => {
    const historyReq = new NextRequest(`http://localhost/api/inventory/${itemId}/history`);
    const historyRes = await historyGet(historyReq, { params: { id: String(itemId) } });
    const entries: { changedByName: string }[] = await historyRes.json();
    expect(entries).toHaveLength(2);
    expect(entries[0].changedByName).toBe("KInvTenantB");
    expect(entries[1].changedByName).toBe("KInvTenantA");
  });
});
