import { NextRequest, NextResponse } from "next/server";
import { sendReminder, sendRentReminders } from "@/lib/send-reminder";

const SETTING_KEY: Record<string, string> = {
  trash: "autoTrashReminder",
  bathroom: "autoBathroomReminder",
  dishes: "autoDishesReminder",
  rent: "autoRentReminder",
};

export async function GET(req: NextRequest) {
  // Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") as "trash" | "bathroom" | "dishes" | "rent";
  if (!type || !["trash", "bathroom", "dishes", "rent"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Check if auto reminder is enabled in DB
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY[type] } });
  if (setting?.value !== "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  try {
    if (type === "rent") {
      const result = await sendRentReminders();
      return NextResponse.json({ ok: true, ...result });
    }
    const result = await sendReminder(type);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
