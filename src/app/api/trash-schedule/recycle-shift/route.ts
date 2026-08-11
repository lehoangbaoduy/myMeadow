import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseLocalDateString, recordRecycleShift } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";
import type { RecycleShiftRow } from "@/lib/rotation-admin-data";

const recycleShiftSchema = z.object({
  effectiveDate: z.string(),
  hasRecycle: z.boolean(),
  reason: z.string().optional().nullable(),
});

// POST /api/trash-schedule/recycle-shift — admin records an effective-dated
// override of which Thursdays are recycle weeks. Propagates forward from
// effectiveDate; past weeks (and already-materialized TrashAssignment rows)
// are untouched — see recordRecycleShift.
export async function POST(req: NextRequest) {
  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = recycleShiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recycle shift payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const effectiveDate = parseLocalDateString(parsed.data.effectiveDate);
  if (!effectiveDate) {
    return NextResponse.json({ error: "effectiveDate must be a valid YYYY-MM-DD date" }, { status: 400 });
  }

  try {
    const shift = await recordRecycleShift({
      effectiveDate,
      hasRecycle: parsed.data.hasRecycle,
      actorUserId: gate.user.id,
      reason: parsed.data.reason ?? undefined,
    });

    const full = await prisma.recycleShift.findUnique({ where: { id: shift.id } });
    if (!full) return NextResponse.json({ error: "Recycle shift recorded but could not be reloaded" }, { status: 500 });

    const actor = await prisma.user.findUnique({
      where: { id: full.actorUserId },
      include: { tenant: { select: { name: true } } },
    });

    const row: RecycleShiftRow = {
      id: full.id,
      effectiveDate: full.effectiveDate.toISOString().split("T")[0],
      hasRecycle: full.hasRecycle,
      reason: full.reason,
      actorName: actor?.tenant?.name ?? "Admin",
      createdAt: full.createdAt.toISOString(),
    };

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to record recycle shift";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
