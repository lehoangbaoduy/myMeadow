import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getWeekIndex, getThursdayOfWeek } from "@/lib/trash-schedule";

const MALE_TENANTS = ["Bảo", "Cường", "Khoa", "Dương"];
const ALL_TENANTS = ["Bảo", "Cường", "Khoa", "Dương", "Ngân", "Nhi", "Thảo"];

function getTrashAssignment(today: Date) {
  const thursday = getThursdayOfWeek(today);
  const weekIdx = getWeekIndex(thursday);
  return MALE_TENANTS[((weekIdx % MALE_TENANTS.length) + MALE_TENANTS.length) % MALE_TENANTS.length];
}

function getBathroomAssignment(today: Date) {
  const thursday = getThursdayOfWeek(today);
  const weekIdx = getWeekIndex(thursday);
  return ALL_TENANTS[
    ((Math.floor(weekIdx / 2) % ALL_TENANTS.length) + ALL_TENANTS.length) % ALL_TENANTS.length
  ];
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type } = await req.json(); // "trash" | "bathroom"
  const today = new Date();
  const tenantName = type === "trash" ? getTrashAssignment(today) : getBathroomAssignment(today);

  // Find the tenant by name
  const tenant = await prisma.tenant.findFirst({ where: { name: tenantName } });
  if (!tenant) {
    return NextResponse.json({ error: `Tenant "${tenantName}" not found` }, { status: 404 });
  }

  let content: string;
  if (type === "trash") {
    const thursday = getThursdayOfWeek(today);
    const dateStr = thursday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    content = `Hey ${tenantName}! 👋 Just a friendly reminder — it's your turn to take out the trash this Thursday (${dateStr}). Please bring the bins to the curb by 7 PM. Thank you for keeping our home clean! 🗑️`;
  } else {
    content = `Hey ${tenantName}! ✨ This is your 2-week bathroom cleaning rotation. Please give the bathroom a thorough scrub (toilet, sink, mirror, floor) before Sunday. Your effort keeps our home fresh — thank you! ✨`;
  }

  await prisma.notification.create({
    data: {
      userId: tenant.userId,
      fromName: "Admin",
      content,
    },
  });

  return NextResponse.json({ ok: true, notified: tenantName });
}
