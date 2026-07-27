import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDishesDutyRoster } from "@/lib/duty-tenants";
import { unitLabel } from "@/lib/rotation-core";
import {
  getFridaysInMonth,
  generateSchedule,
  mergeWithOverrides,
} from "@/lib/dishes-schedule";

const unitInclude = {
  tenant: { select: { id: true, name: true } },
  team: { include: { members: { include: { tenant: { select: { id: true, name: true } } } } } },
} as const;

// GET /api/dishes-schedule?year=2026&month=3  (month is 1-indexed)
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1) - 1; // convert to 0-indexed

  const fridays = getFridaysInMonth(year, month);

  const roster = await getDishesDutyRoster();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const dbOverrides = await prisma.dishesAssignment.findMany({
    where: {
      isOverride: true,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: { unit: { include: unitInclude } },
  });

  const generated = generateSchedule(
    fridays,
    roster.map((r) => r.label)
  );

  const overrideData = dbOverrides.map((o) => ({
    date: o.date,
    tenantName: o.unit ? unitLabel(o.unit) : o.deletedUnitLabel ?? "Deleted User",
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
  unitId: z.number().int().positive(),
});

// PUT /api/dishes-schedule — admin override a single Friday
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
    return NextResponse.json({ error: "date and unitId are required" }, { status: 400 });
  }
  const { date, unitId } = parsed.data;

  const parsedDate = new Date(date);
  if (parsedDate.getDay() !== 5) {
    return NextResponse.json({ error: "Date must be a Friday" }, { status: 400 });
  }

  const unit = await prisma.rotationUnit.findUnique({ where: { id: unitId } });
  if (!unit || unit.rotationType !== "TRASH_DISHES") {
    return NextResponse.json({ error: "unitId must reference a TRASH_DISHES rotation unit" }, { status: 400 });
  }

  const assignment = await prisma.dishesAssignment.upsert({
    where: { date: parsedDate },
    update: { unitId, isOverride: true },
    create: { date: parsedDate, unitId, isOverride: true },
  });

  return NextResponse.json(assignment);
}
