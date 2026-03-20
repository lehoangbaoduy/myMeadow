import { NextRequest, NextResponse } from "next/server";
import { sendReminder } from "@/lib/send-reminder";

export async function GET(req: NextRequest) {
  // Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") as "trash" | "bathroom";
  if (!type || !["trash", "bathroom"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Check if auto reminder is enabled in DB
  const settingKey = type === "trash" ? "autoTrashReminder" : "autoBathroomReminder";
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.appSetting.findUnique({ where: { key: settingKey } });
  if (setting?.value !== "true") {
    console.log(`[cron] ${type} reminder is disabled — skipping`);
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  try {
    const result = await sendReminder(type);
    console.log(`[cron] reminder sent:`, result);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(`[cron] reminder failed:`, (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
