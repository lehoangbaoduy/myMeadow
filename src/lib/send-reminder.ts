import { prisma } from "@/lib/prisma";
import { getThursdayOfWeek } from "@/lib/trash-schedule";
import { getFridayOfWeek } from "@/lib/dishes-schedule";
import { resolveUnitTenants } from "@/lib/rotation-core";
import { Resend } from "resend";

let resend: Resend | null = null;
function getResendClient(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

interface DeliverableTenant {
  name: string;
  userId: number;
  phone: string | null;
  email: string | null;
}

/** Sends one reminder via in-app notification + SMS (Textbelt) + email (Resend). */
async function deliverReminder(
  tenant: DeliverableTenant,
  content: string,
  subject: string
): Promise<string[]> {
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
    const { error: emailError } = await getResendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "MyMeadow <onboarding@resend.dev>",
      to: tenant.email,
      subject,
      text: content,
    }).catch((e) => ({ error: { message: e.message } }));
    if (emailError) warnings.push(`Email failed: ${JSON.stringify(emailError)}`);
  }

  return warnings;
}

/** Builds the reminder content for one tenant/team member. Personalized per-recipient, even when the turn belongs to a team. */
function buildContent(type: "trash" | "bathroom" | "dishes", name: string, dateStr: string): { content: string; subject: string } {
  if (type === "trash") {
    return {
      content: `Hey ${name}! 👋 Just a friendly reminder — it's your turn to take out the trash this Thursday (${dateStr}). Please bring the bins to the curb by 7 PM. Thank you for keeping our home clean! 🚮`,
      subject: `🚮 Trash Reminder — ${dateStr}`,
    };
  }
  if (type === "bathroom") {
    return {
      content: `Hey ${name}! 🛁 This is your bathroom cleaning turn. Please give the bathroom a thorough scrub (toilet, sink, mirror, floor). Your effort keeps our home fresh — thank you! 🛁`,
      subject: `🛁 Bathroom Cleaning Reminder`,
    };
  }
  return {
    content: `Hey ${name}! 🍽️ Just a friendly reminder — it's your turn on dish duty this week (${dateStr}). Please keep the sink and drying rack clear. Thank you for keeping our kitchen tidy! 🍽️`,
    subject: `🍽️ Dish Duty Reminder — ${dateStr}`,
  };
}

export async function sendReminder(type: "trash" | "bathroom" | "dishes"): Promise<{
  notified: string;
  warnings: string[];
}> {
  const today = new Date();

  let tenants: DeliverableTenant[];
  let dateStr: string;

  if (type === "trash") {
    const thursday = getThursdayOfWeek(today);
    dateStr = thursday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    tenants = await resolveUnitTenants("TRASH_DISHES", thursday);
    if (tenants.length === 0) throw new Error("No one is currently assigned to the trash/dishes rotation");
  } else if (type === "bathroom") {
    dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    tenants = await resolveUnitTenants("BATHROOM", today);
    if (tenants.length === 0) throw new Error("No one is currently assigned to the bathroom rotation");
  } else {
    const friday = getFridayOfWeek(today);
    dateStr = friday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    tenants = await resolveUnitTenants("TRASH_DISHES", friday);
    if (tenants.length === 0) throw new Error("No one is currently assigned to the trash/dishes rotation");
  }

  const warnings: string[] = [];
  for (const tenant of tenants) {
    const { content, subject } = buildContent(type, tenant.name, dateStr);
    const tenantWarnings = await deliverReminder(tenant, content, subject);
    warnings.push(...tenantWarnings.map((w) => `${tenant.name}: ${w}`));
  }

  return { notified: tenants.map((t) => t.name).join(", "), warnings };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns the next occurrence of dueDay on or after `today` (rolls into next month if already passed). */
function computeNextRentDueDate(today: Date, dueDay: number): Date {
  const clampedThisMonth = Math.min(dueDay, daysInMonth(today.getFullYear(), today.getMonth()));
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), clampedThisMonth);
  if (thisMonthDue >= today) return thisMonthDue;

  const nextMonth = today.getMonth() + 1;
  const clampedNextMonth = Math.min(dueDay, daysInMonth(today.getFullYear(), nextMonth));
  return new Date(today.getFullYear(), nextMonth, clampedNextMonth);
}

/**
 * Sends rent reminders to every active tenant with a rentAmount set, once the
 * configured lead time before rentDueDay is reached. Idempotent per tenant/month/year
 * (keyed off the upcoming due date, not today) via RentReminderLog, so repeated cron
 * runs within the same reminder window won't double-send.
 *
 * `bypassDateGate` lets an admin's manual "Send now" fire regardless of today's date —
 * it still targets the same upcoming due date so RentReminderLog dedupes against a
 * later cron run for that same cycle.
 */
export async function sendRentReminders(options?: { bypassDateGate?: boolean }): Promise<{
  notified: string[];
  warnings: string[];
}> {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["rentDueDay", "rentReminderLeadDays"] } },
  });
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const dueDay = Number(settingMap.rentDueDay ?? "1");
  const leadDays = Number(settingMap.rentReminderLeadDays ?? "3");

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const dueDate = computeNextRentDueDate(today, dueDay);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const month = dueDate.getMonth() + 1;
  const year = dueDate.getFullYear();

  if (!options?.bypassDateGate && daysUntilDue > leadDays) {
    return { notified: [], warnings: [`Not yet in reminder window (next due ${dueDate.toDateString()}, ${daysUntilDue} days away, lead is ${leadDays})`] };
  }

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, rentAmount: { not: null } },
    orderBy: { id: "asc" },
  });

  const notified: string[] = [];
  const warnings: string[] = [];

  for (const tenant of tenants) {
    const alreadySent = await prisma.rentReminderLog.findUnique({
      where: { tenantId_month_year: { tenantId: tenant.id, month, year } },
    });
    if (alreadySent) continue;

    const dueDateStr = dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const content = `Hey ${tenant.name}! 🏠 Friendly reminder that your rent of $${tenant.rentAmount} is due on ${dueDateStr}. Thank you!`;
    const subject = `🏠 Rent Reminder — due ${dueDateStr}`;

    const tenantWarnings = await deliverReminder(tenant, content, subject);
    warnings.push(...tenantWarnings.map((w) => `${tenant.name}: ${w}`));

    await prisma.rentReminderLog.create({ data: { tenantId: tenant.id, month, year } });
    notified.push(tenant.name);
  }

  return { notified, warnings };
}
