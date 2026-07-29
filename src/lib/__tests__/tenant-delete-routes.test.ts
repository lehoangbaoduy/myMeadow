import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { DELETE as tenantDelete } from "@/app/api/tenants/[id]/route";
import { makePlaceholderClerkId } from "@/lib/tenant-placeholder";

const ADMIN_CLERK_ID = "test_del_admin";

function mockAuthAs(clerkId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as unknown as Awaited<ReturnType<typeof auth>>);
}

function makeReq(id: number) {
  return new NextRequest(`http://localhost/api/tenants/${id}`, { method: "DELETE" });
}

beforeAll(async () => {
  const admin = await prisma.user.findUnique({ where: { clerkId: ADMIN_CLERK_ID } });
  if (!admin) await prisma.user.create({ data: { clerkId: ADMIN_CLERK_ID, role: "ADMIN", registrationComplete: true } });
});

/**
 * Regression coverage for the reported bug: deleting a placeholder tenant
 * silently did nothing when that placeholder had any Notification rows
 * (e.g. kitchen-inventory alerts, which go out to every user including
 * placeholders). Notification.user has no cascade delete and the DELETE
 * transaction never cleaned those rows up, so prisma.user.delete() hit a
 * foreign-key constraint, threw, and the client's unguarded error-path
 * res.json() swallowed the resulting failure.
 */
describe("DELETE /api/tenants/[id] — placeholder with Notification rows", () => {
  it("deletes cleanly even when the placeholder's user has Notification rows", async () => {
    const clerkId = makePlaceholderClerkId();
    const user = await prisma.user.create({ data: { clerkId, role: "TENANT", registrationComplete: true } });
    const tenant = await prisma.tenant.create({
      data: { name: "Test Placeholder", gender: "MALE", userId: user.id, isActive: false },
    });
    await prisma.notification.create({
      data: { userId: user.id, fromName: "Kitchen Inventory", content: "Something is running out!" },
    });

    mockAuthAs(ADMIN_CLERK_ID);
    const res = await tenantDelete(makeReq(tenant.id), { params: { id: String(tenant.id) } });
    expect(res.status).toBe(200);

    const stillThere = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(stillThere).toBeNull();
    const orphanedNotifications = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(orphanedNotifications).toHaveLength(0);
  });

  it("still rejects deleting a real (non-placeholder) resident", async () => {
    const clerkId = "test_del_real_tenant";
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) user = await prisma.user.create({ data: { clerkId, role: "TENANT", registrationComplete: true } });
    let tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    if (!tenant) tenant = await prisma.tenant.create({ data: { name: "Real Resident", gender: "MALE", userId: user.id, isActive: true } });

    mockAuthAs(ADMIN_CLERK_ID);
    const res = await tenantDelete(makeReq(tenant.id), { params: { id: String(tenant.id) } });
    expect(res.status).toBe(403);
  });
});
