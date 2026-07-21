import { prisma } from "@/lib/prisma";
import { getWeekIndex, getThursdayOfWeek } from "@/lib/trash-schedule";
import { getWeekIndex as getDishesWeekIndex, getSundayOfWeek } from "@/lib/dishes-schedule";
import { getTrashDutyTenants, getBathroomDutyTenants, getDishesDutyTenants } from "@/lib/duty-tenants";
import { Resend } from "resend";

let resend: Resend | null = null;
function getResendClient(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function pickByWeekIndex<T>(list: T[], weekIdx: number): T {
  return list[((weekIdx % list.length) + list.length) % list.length];
}

interface DeliverableTenant {
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

export async function sendReminder(type: "trash" | "bathroom" | "dishes"): Promise<{
  notified: string;
  warnings: string[];
}> {
  const today = new Date();

  let tenant;
  let content: string;
  let subject: string;

  if (type === "trash") {
    const thursday = getThursdayOfWeek(today);
    const weekIdx = getWeekIndex(thursday);
    const trashTenants = await getTrashDutyTenants();
    if (trashTenants.length === 0) throw new Error("No tenants with trash duty found");
    tenant = pickByWeekIndex(trashTenants, weekIdx);
    const dateStr = thursday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    content = `Hey ${tenant.name}! 👋 Just a friendly reminder — it's your turn to take out the trash this Thursday (${dateStr}). Please bring the bins to the curb by 7 PM. Thank you for keeping our home clean! 🗑️`;
    subject = `🗑️ Trash Reminder — ${dateStr}`;
  } else if (type === "bathroom") {
    const thursday = getThursdayOfWeek(today);
    const weekIdx = getWeekIndex(thursday);
    const bathroomTenants = await getBathroomDutyTenants();
    if (bathroomTenants.length === 0) throw new Error("No tenants with bathroom duty found");
    tenant = pickByWeekIndex(bathroomTenants, Math.floor(weekIdx / 2));
    content = `Hey ${tenant.name}! ✨ This is your 2-week bathroom cleaning rotation. Please give the bathroom a thorough scrub (toilet, sink, mirror, floor) before Sunday. Your effort keeps our home fresh — thank you! ✨`;
    subject = `✨ Bathroom Cleaning Reminder`;
  } else {
    const sunday = getSundayOfWeek(today);
    const weekIdx = getDishesWeekIndex(sunday);
    const dishesDutyTenants = await getDishesDutyTenants();
    if (dishesDutyTenants.length === 0) throw new Error("No residents on dish duty");
    tenant = pickByWeekIndex(dishesDutyTenants, weekIdx);
    const dateStr = sunday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    content = `Hey ${tenant.name}! 🍽️ Just a friendly reminder — it's your turn on dish duty this week (${dateStr}). Please keep the sink and drying rack clear. Thank you for keeping our kitchen tidy! 🍽️`;
    subject = `🍽️ Dish Duty Reminder — ${dateStr}`;
  }

  const warnings = await deliverReminder(tenant, content, subject);

  return { notified: tenant.name, warnings };
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
