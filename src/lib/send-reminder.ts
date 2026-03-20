import { prisma } from "@/lib/prisma";
import { getWeekIndex, getThursdayOfWeek } from "@/lib/trash-schedule";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function pickByWeekIndex<T>(list: T[], weekIdx: number): T {
  return list[((weekIdx % list.length) + list.length) % list.length];
}

export async function sendReminder(type: "trash" | "bathroom"): Promise<{
  notified: string;
  warnings: string[];
}> {
  const today = new Date();
  const thursday = getThursdayOfWeek(today);
  const weekIdx = getWeekIndex(thursday);

  let tenant;
  if (type === "trash") {
    const maleTenants = await prisma.tenant.findMany({
      where: { gender: "MALE", isActive: true },
      orderBy: { id: "asc" },
    });
    if (maleTenants.length === 0) throw new Error("No active male tenants found");
    tenant = pickByWeekIndex(maleTenants, weekIdx);
  } else {
    const bathroomTenants = await prisma.tenant.findMany({
      where: { bathroomDuty: true, isActive: true },
      orderBy: { id: "asc" },
    });
    if (bathroomTenants.length === 0) throw new Error("No tenants with bathroom duty found");
    tenant = pickByWeekIndex(bathroomTenants, Math.floor(weekIdx / 2));
  }

  const tenantName = tenant.name;
  const dateStr = thursday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const content =
    type === "trash"
      ? `Hey ${tenantName}! 👋 Just a friendly reminder — it's your turn to take out the trash this Thursday (${dateStr}). Please bring the bins to the curb by 7 PM. Thank you for keeping our home clean! 🗑️`
      : `Hey ${tenantName}! ✨ This is your 2-week bathroom cleaning rotation. Please give the bathroom a thorough scrub (toilet, sink, mirror, floor) before Sunday. Your effort keeps our home fresh — thank you! ✨`;

  const subject =
    type === "trash"
      ? `🗑️ Trash Reminder — ${dateStr}`
      : `✨ Bathroom Cleaning Reminder`;

  const warnings: string[] = [];

  // 1. In-app notification
  await prisma.notification.create({
    data: { userId: tenant.userId, fromName: "Admin", content },
  });

  // 2. SMS via Textbelt
  if (process.env.TEXTBELT_ENABLED === "true") {
    if (!tenant.phone) {
      warnings.push("SMS skipped: no phone number on tenant");
    } else if (!process.env.TEXTBELT_API_KEY) {
      warnings.push("SMS skipped: TEXTBELT_API_KEY not set");
    } else {
      const smsRes = await fetch("https://textbelt.com/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: tenant.phone, message: content, key: process.env.TEXTBELT_API_KEY }),
      }).catch((e) => { warnings.push(`SMS error: ${e.message}`); return null; });
      if (smsRes) {
        const smsData = await smsRes.json().catch(() => ({}));
        if (!smsData.success) warnings.push(`SMS failed: ${smsData.error ?? JSON.stringify(smsData)}`);
      }
    }
  }

  // 3. Email via Resend
  if (!tenant.email) {
    warnings.push("Email skipped: no email on tenant");
  } else if (!process.env.RESEND_API_KEY) {
    warnings.push("Email skipped: RESEND_API_KEY not set");
  } else {
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "MyMeadow <onboarding@resend.dev>",
      to: tenant.email,
      subject,
      text: content,
    }).catch((e) => ({ error: { message: e.message } }));
    if (emailError) warnings.push(`Email failed: ${JSON.stringify(emailError)}`);
  }

  return { notified: tenantName, warnings };
}
