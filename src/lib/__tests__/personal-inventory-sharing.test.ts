import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as listGet, POST as listPost } from "@/app/api/inventory-personal/route";
import { PATCH as itemPatch } from "@/app/api/inventory-personal/[id]/route";
import { PUT as sharePut } from "@/app/api/inventory-personal/[id]/share/route";
import { GET as roommatesGet } from "@/app/api/inventory-personal/roommates/route";

/**
 * Sharing is a read-only visibility grant: the owner picks which residents
 * can see an item, but only the owner (or an admin) can ever edit or delete
 * it, or change who it's shared with.
 */

const OWNER_CLERK_ID = "test_pis_owner";
const VIEWER_CLERK_ID = "test_pis_viewer";
const OUTSIDER_CLERK_ID = "test_pis_outsider";

let ownerTenantId: number;
let viewerTenantId: number;
let itemId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  await prisma.personalInventoryItem.deleteMany({ where: { name: "Shared Snacks" } });

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
  const createReq = new NextRequest("http://localhost/api/inventory-personal", {
    method: "POST",
    body: JSON.stringify({ name: "Shared Snacks", quantity: 3, unit: "bags" }),
  });
  const created = await (await listPost(createReq)).json();
  itemId = created.id;
});

describe("personal inventory sharing", () => {
  it("roommates endpoint excludes the caller and includes other active residents", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const res = await roommatesGet();
    const roommates: { id: number; name: string }[] = await res.json();
    expect(roommates.some((r) => r.id === ownerTenantId)).toBe(false);
    expect(roommates.some((r) => r.id === viewerTenantId)).toBe(true);
  });

  it("owner shares the item with the viewer", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [viewerTenantId] }),
    });
    const res = await sharePut(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(200);
    const shares = await res.json();
    expect(shares).toEqual([{ tenantId: viewerTenantId, name: "PISViewer" }]);
  });

  it("the viewer now sees the item under sharedWithMe", async () => {
    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(req)).json();
    expect(body.sharedWithMe.some((i: { id: number }) => i.id === itemId)).toBe(true);
  });

  it("an outsider (not shared with) does not see the item under sharedWithMe", async () => {
    mockAuthAs(OUTSIDER_CLERK_ID);
    const req = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(req)).json();
    expect(body.sharedWithMe.some((i: { id: number }) => i.id === itemId)).toBe(false);
  });

  it("the viewer cannot PATCH the shared item — sharing is read-only (403)", async () => {
    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 999 }),
    });
    const res = await itemPatch(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(403);
  });

  it("the viewer cannot change who the item is shared with (403)", async () => {
    mockAuthAs(VIEWER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [] }),
    });
    const res = await sharePut(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(403);
  });

  it("owner can revoke a share by omitting the tenantId", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [] }),
    });
    const res = await sharePut(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);

    mockAuthAs(VIEWER_CLERK_ID);
    const listReq = new NextRequest("http://localhost/api/inventory-personal");
    const body = await (await listGet(listReq)).json();
    expect(body.sharedWithMe.some((i: { id: number }) => i.id === itemId)).toBe(false);
  });

  it("rejects sharing an item with its own owner (400)", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [ownerTenantId] }),
    });
    const res = await sharePut(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(400);
  });

  it("rejects sharing with a nonexistent tenantId (400)", async () => {
    mockAuthAs(OWNER_CLERK_ID);
    const req = new NextRequest(`http://localhost/api/inventory-personal/${itemId}/share`, {
      method: "PUT",
      body: JSON.stringify({ tenantIds: [999999] }),
    });
    const res = await sharePut(req, { params: { id: String(itemId) } });
    expect(res.status).toBe(400);
  });
});
