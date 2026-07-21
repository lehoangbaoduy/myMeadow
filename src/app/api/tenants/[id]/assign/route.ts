import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

const assignSchema = z.object({
  placeholderTenantId: z.number().int().positive(),
});

/**
 * Merges a placeholder resident's reserved room/rent/duty config onto a real
 * (Clerk-registered) resident, then deletes the now-redundant placeholder.
 * `params.id` is the real resident being assigned a room.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "placeholderTenantId is required" }, { status: 400 });
  }

  const realTenantId = Number(params.id);
  const { placeholderTenantId } = parsed.data;
  if (realTenantId === placeholderTenantId) {
    return NextResponse.json({ error: "Cannot assign a resident to themselves" }, { status: 400 });
  }

  const [realTenant, placeholderTenant] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: realTenantId }, include: { user: { select: { clerkId: true } } } }),
    prisma.tenant.findUnique({ where: { id: placeholderTenantId }, include: { user: { select: { id: true, clerkId: true } } } }),
  ]);

  if (!realTenant || !placeholderTenant) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }
  if (isPlaceholderClerkId(realTenant.user.clerkId)) {
    return NextResponse.json({ error: "Target resident is itself a placeholder" }, { status: 400 });
  }
  if (!isPlaceholderClerkId(placeholderTenant.user.clerkId)) {
    return NextResponse.json({ error: "placeholderTenantId does not refer to a placeholder resident" }, { status: 400 });
  }

  const [merged] = await prisma.$transaction([
    prisma.tenant.update({
      where: { id: realTenantId },
      data: {
        roomNumber: placeholderTenant.roomNumber,
        rentAmount: placeholderTenant.rentAmount,
        utilityShare: placeholderTenant.utilityShare,
        bathroomDuty: placeholderTenant.bathroomDuty,
        dishesDuty: placeholderTenant.dishesDuty,
        trashDuty: placeholderTenant.trashDuty,
      },
    }),
    prisma.trashAssignment.deleteMany({ where: { tenantId: placeholderTenantId } }),
    prisma.dishesAssignment.deleteMany({ where: { tenantId: placeholderTenantId } }),
    prisma.rentReminderLog.deleteMany({ where: { tenantId: placeholderTenantId } }),
    prisma.maintenanceRequest.deleteMany({ where: { tenantId: placeholderTenantId } }),
    prisma.tenant.delete({ where: { id: placeholderTenantId } }),
    prisma.user.delete({ where: { id: placeholderTenant.user.id } }),
  ]);

  return NextResponse.json(merged);
}
