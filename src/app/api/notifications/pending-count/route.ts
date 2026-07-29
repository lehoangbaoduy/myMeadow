import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { effectiveAnnouncementStatus } from "@/lib/announcement-status";

/**
 * Total "needs your attention" count for the current user: unread active
 * announcements for everyone, plus unactioned maintenance requests for
 * admins. Backs the mobile PWA app-icon badge (see useAppBadge).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [announcements, myRecipientRows, pendingRequests] = await Promise.all([
    prisma.announcement.findMany({ select: { id: true, status: true, expiresAt: true } }),
    prisma.announcementRecipient.findMany({ where: { userId: caller.id }, select: { announcementId: true, clearedAt: true } }),
    caller.role === "ADMIN"
      ? prisma.maintenanceRequest.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ]);

  const clearedAtByAnnouncementId = new Map(myRecipientRows.map((r) => [r.announcementId, r.clearedAt]));
  const pendingAnnouncements = announcements.filter(
    (a) =>
      effectiveAnnouncementStatus({
        status: a.status,
        expiresAt: a.expiresAt,
        clearedAt: clearedAtByAnnouncementId.get(a.id) ?? null,
      }) === "ACTIVE"
  ).length;

  return NextResponse.json({ count: pendingAnnouncements + pendingRequests });
}
