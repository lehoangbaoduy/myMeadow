import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeItemWrite } from "@/lib/personal-inventory-authz";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

const shareSchema = z.object({
  tenantIds: z.array(z.number().int()),
});

/** Replaces the full share list for an item with the given set of tenantIds. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = Number(params.id);
  const authz = await authorizeItemWrite(userId, itemId);
  if (authz instanceof NextResponse) return authz;
  const { item } = authz;

  const parsed = shareSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenantIds = Array.from(new Set(parsed.data.tenantIds));
  if (tenantIds.includes(item.tenantId)) {
    return NextResponse.json({ error: "Cannot share an item with its own owner" }, { status: 400 });
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
    prisma.personalInventoryShare.deleteMany({ where: { itemId, tenantId: { notIn: tenantIds } } }),
    ...tenantIds.map((tenantId) =>
      prisma.personalInventoryShare.upsert({
        where: { itemId_tenantId: { itemId, tenantId } },
        create: { itemId, tenantId },
        update: {},
      })
    ),
  ]);

  const shares = await prisma.personalInventoryShare.findMany({
    where: { itemId },
    include: { tenant: { select: { id: true, name: true } } },
  });

  return NextResponse.json(shares.map((s) => ({ tenantId: s.tenant.id, name: s.tenant.name })));
}
