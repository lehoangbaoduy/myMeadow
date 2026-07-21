import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDishesDutyTenants } from "@/lib/duty-tenants";
import {
  getSundaysInMonth,
  generateSchedule,
  mergeWithOverrides,
} from "@/lib/dishes-schedule";

// GET /api/dishes-schedule?year=2026&month=3  (month is 1-indexed)
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1) - 1; // convert to 0-indexed

  const sundays = getSundaysInMonth(year, month);

  const dutyTenants = await getDishesDutyTenants();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const dbOverrides = await prisma.dishesAssignment.findMany({
    where: {
      isOverride: true,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: { tenant: { select: { name: true } } },
  });

  const generated = generateSchedule(
    sundays,
    dutyTenants.map((t) => t.name)
  );

  const overrideData = dbOverrides.map((o) => ({
    date: o.date,
    tenantName: o.tenant.name,
  }));

  const merged = mergeWithOverrides(generated, overrideData);

  return NextResponse.json(merged.map((e) => ({
    date: e.date.toISOString(),
    tenantName: e.tenantName,
    isOverride: e.isOverride,
  })));
}

const putSchema = z.object({
  date: z.string(),
  tenantId: z.number().int().positive(),
});

// PUT /api/dishes-schedule — admin override a single Sunday
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`dishes-override:${userId}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "date and tenantId are required" }, { status: 400 });
  }
  const { date, tenantId } = parsed.data;

  const parsedDate = new Date(date);
  if (parsedDate.getDay() !== 0) {
    return NextResponse.json({ error: "Date must be a Sunday" }, { status: 400 });
  }

  const assignment = await prisma.dishesAssignment.upsert({
    where: {
      id: (
        await prisma.dishesAssignment.findFirst({
          where: {
            date: parsedDate,
            isOverride: true,
          },
        })
      )?.id ?? 0,
    },
    update: { tenantId, isOverride: true },
    create: {
      date: parsedDate,
      tenantId,
      isOverride: true,
    },
  });

  return NextResponse.json(assignment);
}
