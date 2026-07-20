import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendReminder, sendRentReminders } from "@/lib/send-reminder";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`remind:${userId}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reminder requests, please slow down" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const { type } = await req.json();
  if (!["trash", "bathroom", "dishes", "rent"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    if (type === "rent") {
      const result = await sendRentReminders({ bypassDateGate: true });
      return NextResponse.json({ ok: true, ...result });
    }
    const result = await sendReminder(type);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
