import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as listGet, POST as itemPost } from "@/app/api/inventory-personal/route";
import { PATCH as itemPatch } from "@/app/api/inventory-personal/[id]/route";
import { POST as listPost } from "@/app/api/inventory-personal/lists/route";
import { PUT as listSharePut } from "@/app/api/inventory-personal/lists/[id]/share/route";
import { GET as roommatesGet } from "@/app/api/inventory-personal/roommates/route";

/**
 * Sharing is a read-only visibility grant at the LIST level: the owner picks
 * which residents can see an entire list — and everything in it, including
 * items added later — but only the owner (or an admin) can ever edit,
 * delete, or change who a list is shared with.
 */

const OWNER_CLERK_ID = "test_pis_owner";
const VIEWER_CLERK_ID = "test_pis_viewer";
const OUTSIDER_CLERK_ID = "test_pis_outsider";

let ownerTenantId: number;
let viewerTenantId: number;
let listId: number;
let itemId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  await prisma.personalInventoryList.deleteMany({ where: { name: "Shared Snacks List" } });

  for (const [clerkId, name] of [
    [OWNER_CLERK_ID, "PISOwner"],
    [VIEWER_CLERK_ID, "PISViewer"],
    [OUTSIDER_CLERK_ID, "PISOutsider"],
  ] as const) {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({ data: { clerkId, role: "TENANT", registrationComplete: true } });
    }
    let tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name, gender: "MALE", userId: user.id, isActive: true } });
    }
    if (clerkId === OWNER_CLERK_ID) ownerTenantId = tenant.id;
    if (clerkId === VIEWER_CLERK_ID) viewerTenantId = tenant.id;
  }

  mockAuthAs(OWNER_CLERK_ID);
  const listReq = new NextRequest("http://localhost/api/inventory-personal/lists", {
    method: "POST",
    body: JSON.stringify({ name: "Shared Snacks List" }),
  });
  listId = (await (await listPost(listReq)).json()).id;

  const createReq = new NextRequest("http://localhost/api/inventory-personal", {
    method: "POST",
    body: JSON.stringify({ listId, name: "Shared Snacks", quantity: 3, unit: "bags" }),
  });
  const created = await (await itemPost(createReq)).json();
  itemId = created.id;
});

describe("personal inventory sharing (list-level)", () => {
  it("roommates endpoint excludes the caller and includes other active residents", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const res = await roommatesGet();
    const roommates: { id: number; name: string }[] = await res.json();
    expect(roommates.some((r) => r.id === ownerTenantId)).toBe(false);
    expect(roommates.some((r) => r.id === viewerTenantId)).toBe(true);
  });

  it("owner shares the list with the viewer", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/lists/${listId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [viewerTenantId] }),
    });
    const res = await listSharePut(req, { params: { id: String(listId) } });
    expect(res.status).toBe(200);
    const shares = await res.json();
    expect(shares).toEqual([{ tenantId: viewerTenantId, name: "PISViewer" }]);
  });

  it("the viewer now sees the list and its item under sharedLists", async () => {
    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(req)).json();
    const sharedList = body.sharedLists.find((l: { id: number }) => l.id === listId);
    expect(sharedList).toBeDefined();
    expect(sharedList.items.some((i: { id: number }) => i.id === itemId)).toBe(true);
  });

  it("adding a new item to an already-shared list makes it visible to the recipient without a new share action", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const addReq = new NextRequest("http://localhost/api/inventory-personal", {
      method: "POST",
      body: JSON.stringify({ listId, name: "Second Shared Item", quantity: 1, unit: "bag" }),
    });
    const addedItem = await (await itemPost(addReq)).json();

    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(req)).json();
    const sharedList = body.sharedLists.find((l: { id: number }) => l.id === listId);
    expect(sharedList.items.some((i: { id: number }) => i.id === addedItem.id)).toBe(true);
  });

  it("an outsider (not shared with) does not see the list under sharedLists", async () => {
    mockAuthAs(OUTSIDER_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(req)).json();
    expect(body.sharedLists.some((l: { id: number }) => l.id === listId)).toBe(false);
  });

  it("the viewer cannot PATCH an item in the shared list — sharing is read-only (403)", async () => {
    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 999 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(403);
  });

  it("the viewer cannot change who the list is shared with (403)", async () => {
    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/lists/${listId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [] }),
    });
    const res = await listSharePut(req, { params: { id: String(listId) } });
    expect(res.status).toBe(403);
  });

  it("owner can revoke a share by omitting the tenantId", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/lists/${listId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [] }),
    });
    const res = await listSharePut(req, { params: { id: String(listId) } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);

    mockAuthAs(VIEWER_CLERK_ID);
    const listReq = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(listReq)).json();
    expect(body.sharedLists.some((l: { id: number }) => l.id === listId)).toBe(false);
  });

  it("rejects sharing a list with its own owner (400)", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/lists/${listId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [ownerTenantId] }),
    });
    const res = await listSharePut(req, { params: { id: String(listId) } });
    expect(res.status).toBe(400);
  });

  it("rejects sharing with a nonexistent tenantId (400)", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/lists/${listId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [999999] }),
    });
    const res = await listSharePut(req, { params: { id: String(listId) } });
    expect(res.status).toBe(400);
  });
});
