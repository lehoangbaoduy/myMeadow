import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  getThursdaysInMonth,
  generateSchedule,
  mergeWithOverrides,
} from "@/lib/trash-schedule";

// GET /api/trash-schedule?year=2026&month=3  (month is 1-indexed)
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1) - 1; // convert to 0-indexed

  const thursdays = getThursdaysInMonth(year, month);

  // Get male tenants from DB
  const maleTenants = await prisma.tenant.findMany({
    where: { gender: "MALE" },
    orderBy: { id: "asc" },
    select: { name: true },
  });

  // Get DB overrides for this window
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const dbOverrides = await prisma.trashAssignment.findMany({
    where: {
      isOverride: true,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: { tenant: { select: { name: true } } },
  });

  const generated = generateSchedule(
    thursdays,
    maleTenants.map((t) => t.name)
  );

  const overrideData = dbOverrides.map((o) => ({
    date: o.date,
    tenantName: o.tenant.name,
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

// PUT /api/trash-schedule — admin override a single Thursday
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { date, tenantId, isRecycle } = body;

  if (!date || !tenantId) {
    return NextResponse.json({ error: "date and tenantId are required" }, { status: 400 });
  }

  const parsedDate = new Date(date);
  if (parsedDate.getDay() !== 4) {
    return NextResponse.json({ error: "Date must be a Thursday" }, { status: 400 });
  }

  const assignment = await prisma.trashAssignment.upsert({
    where: {
      id: (
        await prisma.trashAssignment.findFirst({
          where: {
            date: parsedDate,
            isOverride: true,
          },
        })
      )?.id ?? 0,
    },
    update: { tenantId, isRecycle: isRecycle ?? false, isOverride: true },
    create: {
      date: parsedDate,
      tenantId,
      isRecycle: isRecycle ?? false,
      isOverride: true,
    },
  });

  return NextResponse.json(assignment);
}
