import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ userId: z.number().int().optional() });

/** Resolves which User row this clear/unclear action targets: self by default, or another user if the caller is admin. */
async function resolveTarget(
  clerkId: string,
  requestedUserId: number | undefined
): Promise<NextResponse | { callerId: number; targetUserId: number }> {
  const caller = await prisma.user.findUnique({ where: { clerkId } });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (requestedUserId !== undefined && requestedUserId !== caller.id) {
    if (caller.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const target = await prisma.user.findUnique({ where: { id: requestedUserId } });
    if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    return { callerId: caller.id, targetUserId: target.id };
  }

  return { callerId: caller.id, targetUserId: caller.id };
}

/** Marks the announcement cleared for the target user (self, or another user if caller is admin). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await resolveTarget(userId, parsed.data.userId);
  if (target instanceof NextResponse) return target;

  const announcementId = Number(params.id);
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recipient = await prisma.announcementRecipient.upsert({
    where: { announcementId_userId: { announcementId, userId: target.targetUserId } },
    update: { clearedAt: new Date(), clearedByUserId: target.callerId },
    create: {
      announcementId,
      userId: target.targetUserId,
      clearedAt: new Date(),
      clearedByUserId: target.callerId,
    },
  });

  return NextResponse.json(recipient);
}

/** Restores (un-clears) the announcement for the target user. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await resolveTarget(userId, parsed.data.userId);
  if (target instanceof NextResponse) return target;

  const announcementId = Number(params.id);
  await prisma.announcementRecipient.deleteMany({
    where: { announcementId, userId: target.targetUserId },
  });

  return NextResponse.json({ success: true });
}
