import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTrashDutyRoster } from "@/lib/duty-tenants";
import { unitLabel } from "@/lib/rotation-core";
import {
  getThursdaysInMonth,
  generateSchedule,
  mergeWithOverrides,
} from "@/lib/trash-schedule";

const unitInclude = {
  tenant: { select: { id: true, name: true } },
  team: { include: { members: { include: { tenant: { select: { id: true, name: true } } } } } },
} as const;

// GET /api/trash-schedule?year=2026&month=3  (month is 1-indexed)
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1) - 1; // convert to 0-indexed

  const thursdays = getThursdaysInMonth(year, month);

  const roster = await getTrashDutyRoster();

  // Get DB overrides for this window
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const dbOverrides = await prisma.trashAssignment.findMany({
    where: {
      isOverride: true,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: { unit: { include: unitInclude } },
  });

  const generated = generateSchedule(
    thursdays,
    roster.map((r) => r.label)
  );

  const overrideData = dbOverrides.map((o) => ({
    date: o.date,
    tenantName: o.unit ? unitLabel(o.unit) : o.deletedUnitLabel ?? "Deleted User",
    hasRecycle: o.isRecycle,
  }));

  const merged = mergeWithOverrides(generated, overrideData);

  return NextResponse.json(merged.map((e) => ({
    date: e.date.toISOString(),
    tenantName: e.tenantName,
    hasRecycle: e.hasRecycle,
    isOverride: e.isOverride,
  })));
}

const putSchema = z.object({
  date: z.string(),
  unitId: z.number().int().positive(),
  isRecycle: z.boolean().optional(),
});

// PUT /api/trash-schedule — admin override a single Thursday
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`trash-override:${userId}`, 30, 60_000);
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
  const { date, unitId, isRecycle } = parsed.data;

  const parsedDate = new Date(date);
  if (parsedDate.getDay() !== 4) {
    return NextResponse.json({ error: "Date must be a Thursday" }, { status: 400 });
  }

  const unit = await prisma.rotationUnit.findUnique({ where: { id: unitId } });
  if (!unit || unit.rotationType !== "TRASH_DISHES") {
    return NextResponse.json({ error: "unitId must reference a TRASH_DISHES rotation unit" }, { status: 400 });
  }

  const assignment = await prisma.trashAssignment.upsert({
    where: { date: parsedDate },
    update: { unitId, isRecycle: isRecycle ?? false, isOverride: true },
    create: { date: parsedDate, unitId, isRecycle: isRecycle ?? false, isOverride: true },
  });

  return NextResponse.json(assignment);
}
