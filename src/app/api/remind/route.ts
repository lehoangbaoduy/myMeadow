import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendReminder } from "@/lib/send-reminder";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type } = await req.json();
  if (!["trash", "bathroom"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const result = await sendReminder(type);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
