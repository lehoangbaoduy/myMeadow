import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PATCH as itemPatch } from "@/app/api/maintenance-requests/[id]/route";

const ADMIN_CLERK_ID = "test_mr_admin";
const TENANT_CLERK_ID = "test_mr_tenant";

let tenantId: number;

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

function makeReq(id: number, body: unknown) {
  return new NextRequest(`http://localhost/api/maintenance-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createPendingRequest() {
  const r = await prisma.maintenanceRequest.create({
    data: { tenantId, name: "Test Tenant", requestType: "Other", description: "Test request" },
  });
  return r.id;
}

beforeAll(async () => {
  let admin = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!admin) admin = await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });

  let tenantUser = await prisma.user.findUnique({ where: { clerkId: TENANT_CLERK_ID } });
  if (!tenantUser) tenantUser = await prisma.user.create({ data: { clerkId: TENANT_CLERK_ID, role: "TENANT", registrationComplete: true } });

  let tenant = await prisma.tenant.findFirst({ where: { userId: tenantUser.id } });
  if (!tenant) tenant = await prisma.tenant.create({ data: { name: "Test Tenant", gender: "MALE", userId: tenantUser.id, isActive: true } });
  tenantId = tenant.id;
});

describe("maintenance requests: resolution state machine", () => {
  it("non-admin cannot PATCH a request (403)", async () => {
    const id = await createPendingRequest();
    mockAuthAs(TENANT_CLERK_ID);
    const res = await itemPatch(makeReq(id, { status: "RESOLVED" }), { params: { id: String(id) } });
    expect(res.status).toBe(403);
  });

  it("admin can resolve a PENDING request directly", async () => {
    const id = await createPendingRequest();
    mockAuthAs(ADMIN_CLERK_ID);
    const res = await itemPatch(makeReq(id, { status: "RESOLVED", resolutionNote: "Fixed the sink" }), {
      params: { id: String(id) },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("RESOLVED");
    expect(body.resolutionNote).toBe("Fixed the sink");
    expect(body.resolvedAt).not.toBeNull();
  });

  it("a second resolve attempt on an already-resolved request is rejected (409)", async () => {
    const id = await createPendingRequest();
    mockAuthAs(ADMIN_CLERK_ID);
    const first = await itemPatch(makeReq(id, { status: "RESOLVED" }), { params: { id: String(id) } });
    expect(first.status).toBe(200);

    const second = await itemPatch(makeReq(id, { status: "RESOLVED" }), { params: { id: String(id) } });
    expect(second.status).toBe(409);
  });

  it("cannot reject an already-rejected request (409)", async () => {
    const id = await createPendingRequest();
    mockAuthAs(ADMIN_CLERK_ID);
    await itemPatch(makeReq(id, { status: "REJECTED" }), { params: { id: String(id) } });
    const res = await itemPatch(makeReq(id, { status: "REJECTED" }), { params: { id: String(id) } });
    expect(res.status).toBe(409);
  });

  it("approve then resolve is a valid transition", async () => {
    const id = await createPendingRequest();
    mockAuthAs(ADMIN_CLERK_ID);
    const approved = await itemPatch(makeReq(id, { status: "APPROVED" }), { params: { id: String(id) } });
    expect(approved.status).toBe(200);
    expect((await approved.json()).status).toBe("APPROVED");

    const resolved = await itemPatch(makeReq(id, { status: "RESOLVED" }), { params: { id: String(id) } });
    expect(resolved.status).toBe(200);
    expect((await resolved.json()).status).toBe("RESOLVED");
  });

  it("cannot approve an already-approved request (409)", async () => {
    const id = await createPendingRequest();
    mockAuthAs(ADMIN_CLERK_ID);
    await itemPatch(makeReq(id, { status: "APPROVED" }), { params: { id: String(id) } });
    const res = await itemPatch(makeReq(id, { status: "APPROVED" }), { params: { id: String(id) } });
    expect(res.status).toBe(409);
  });

  it("returns 404 for a nonexistent request id", async () => {
    mockAuthAs(ADMIN_CLERK_ID);
    const res = await itemPatch(makeReq(999999, { status: "RESOLVED" }), { params: { id: "999999" } });
    expect(res.status).toBe(404);
  });
});
