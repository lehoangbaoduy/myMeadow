import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as listGet, POST as listPost } from "@/app/api/inventory-personal/route";
import { PATCH as itemPatch, DELETE as itemDelete } from "@/app/api/inventory-personal/[id]/route";

/**
 * Integration tests against a real local SQLite database (see
 * rotation-admin-routes.test.ts for the rationale). Focus here is the
 * ownership check on [id]/route.ts — personal inventory is NOT shared like
 * the kitchen inventory, so a tenant must never be able to read, edit, or
 * delete another tenant's items via a guessed id.
 */

const ADMIN_CLERK_ID = "test_pi_admin";
const TENANT_A_CLERK_ID = "test_pi_tenant_a";
const TENANT_B_CLERK_ID = "test_pi_tenant_b";

let tenantAId: number;
let tenantBId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  await prisma.personalInventoryItem.deleteMany({});

  let adminUser = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!adminUser) {
    adminUser = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });
  }

  for (const [clerkId, name] of [
    [TENANT_A_CLERK_ID, "PITenantA"],
    [TENANT_B_CLERK_ID, "PITenantB"],
  ] as const) {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({ data: { clerkId, role: "TENANT", registrationComplete: true } });
    }
    let tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name, gender: "MALE", userId: user.id, isActive: true } });
    }
    if (clerkId === TENANT_A_CLERK_ID) tenantAId = tenant.id;
    else tenantBId = tenant.id;
  }
});

describe("personal inventory: ownership", () => {
  it("returns 401 when unauthenticated on list GET", async () => {
    mockAuthAs(null);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const res = await listGet(req);
    expect(res.status).toBe(401);
  });

  it("tenant A can create an item for themselves", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal", {
      method: "POST",
      body: JSON.stringify({ name: "Protein Powder", quantity: 2, unit: "tubs" }),
    });
    const res = await listPost(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Protein Powder");
  });

  it("tenant A's list GET only returns their own items", async () => {
    mockAuthAs(TENANT_B_CLERK_ID);
    const reqB = new NextRequest("http://localhost/api/inventory-personal", {
      method: "POST",
      body: JSON.stringify({ name: "Vitamins", quantity: 1, unit: "bottle" }),
    });
    await listPost(reqB);

    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const res = await listGet(req);
    const items = await res.json();
    expect(items.every((i: { name: string }) => i.name !== "Vitamins")).toBe(true);
  });

  it("tenant B cannot PATCH tenant A's item (403)", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const itemRes = await prisma.personalInventoryItem.findFirst({ where: { tenantId: tenantAId, name: "Protein Powder" } });
    expect(itemRes).not.toBeNull();

    mockAuthAs(TENANT_B_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemRes!.id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 999 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemRes!.id) } });
    expect(res.status).toBe(403);
  });

  it("tenant B cannot DELETE tenant A's item (403)", async () => {
    const itemRes = await prisma.personalInventoryItem.findFirst({ where: { tenantId: tenantAId, name: "Protein Powder" } });
    mockAuthAs(TENANT_B_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemRes!.id}`, { method: "DELETE" });
    const res = await itemDelete(req, { params: { id: String(itemRes!.id) } });
    expect(res.status).toBe(403);

    const stillExists = await prisma.personalInventoryItem.findUnique({ where: { id: itemRes!.id } });
    expect(stillExists).not.toBeNull();
  });

  it("owner (tenant A) can PATCH their own item", async () => {
    const itemRes = await prisma.personalInventoryItem.findFirst({ where: { tenantId: tenantAId, name: "Protein Powder" } });
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemRes!.id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 5 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemRes!.id) } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quantity).toBe(5);
  });

  it("admin can PATCH any tenant's item", async () => {
    const itemRes = await prisma.personalInventoryItem.findFirst({ where: { tenantId: tenantBId, name: "Vitamins" } });
    mockAuthAs(ADMIN_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemRes!.id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 10 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemRes!.id) } });
    expect(res.status).toBe(200);
  });

  it("rejects a duplicate name for the same tenant (409)", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal", {
      method: "POST",
      body: JSON.stringify({ name: "Protein Powder" }),
    });
    const res = await listPost(req);
    expect(res.status).toBe(409);
  });

  it("returns 404 for a nonexistent item id", async () => {
    mockAuthAs(TENANT_A_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal/999999", { method: "DELETE" });
    const res = await itemDelete(req, { params: { id: "999999" } });
    expect(res.status).toBe(404);
  });
});
