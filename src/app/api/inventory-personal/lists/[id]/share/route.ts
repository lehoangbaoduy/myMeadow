import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeListWrite } from "@/lib/personal-inventory-authz";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

const shareSchema = z.object({
  tenantIds: z.array(z.number().int()),
});

/**
 * Replaces the full share list for a list with the given set of tenantIds.
 * Sharing a list grants read-only visibility into every item currently in
 * it, and any item added to it later — resolved at read time, not copied.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listId = Number(params.id);
  const authz = await authorizeListWrite(userId, listId);
  if (authz instanceof NextResponse) return authz;
  const { list } = authz;

  const parsed = shareSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenantIds = Array.from(new Set(parsed.data.tenantIds));
  if (tenantIds.includes(list.tenantId)) {
    return NextResponse.json({ error: "Cannot share a list with its own owner" }, { status: 400 });
  }

  if (tenantIds.length > 0) {
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      include: { user: { select: { clerkId: true } } },
    });
    if (tenants.length !== tenantIds.length) {
      return NextResponse.json({ error: "One or more tenantIds do not exist" }, { status: 400 });
    }
    for (const t of tenants) {
      if (!t.isActive) {
        return NextResponse.json({ error: `Tenant ${t.name} is not active` }, { status: 400 });
      }
      if (isPlaceholderClerkId(t.user.clerkId)) {
        return NextResponse.json({ error: `Tenant ${t.name} is a placeholder and cannot be shared with` }, { status: 400 });
      }
    }
  }

  await prisma.$transaction([
    prisma.personalInventoryListShare.deleteMany({ where: { listId, tenantId: { notIn: tenantIds } } }),
    ...tenantIds.map((tenantId) =>
      prisma.personalInventoryListShare.upsert({
        where: { listId_tenantId: { listId, tenantId } },
        create: { listId, tenantId },
        update: {},
      })
    ),
  ]);

  const shares = await prisma.personalInventoryListShare.findMany({
    where: { listId },
    include: { tenant: { select: { id: true, name: true } } },
  });

  return NextResponse.json(shares.map((s) => ({ tenantId: s.tenant.id, name: s.tenant.name })));
}
