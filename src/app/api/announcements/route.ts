import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { effectiveAnnouncementStatus } from "@/lib/announcement-status";

const createSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  date: z.string().min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [announcements, myRecipientRows, creators] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { date: "desc" } }),
    prisma.announcementRecipient.findMany({ where: { userId: caller.id } }),
    prisma.user.findMany({ include: { tenant: { select: { name: true } } } }),
  ]);

  const recipientByAnnouncementId = new Map(myRecipientRows.map((r) => [r.announcementId, r]));
  const creatorNameById = new Map(creators.map((u) => [u.id, u.tenant?.name ?? null]));

  const result = announcements.map((a) => {
    const recipient = recipientByAnnouncementId.get(a.id);
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
      status: a.status,
      expiresAt: a.expiresAt,
      createdByUserId: a.createdByUserId,
      creatorName: a.createdByUserId ? (creatorNameById.get(a.createdByUserId) ?? "Deleted User") : null,
      clearedAt: recipient?.clearedAt ?? null,
      effectiveStatus: effectiveAnnouncementStatus({ status: a.status, expiresAt: a.expiresAt, clearedAt: recipient?.clearedAt ?? null }),
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdByUserId: caller.id,
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}
