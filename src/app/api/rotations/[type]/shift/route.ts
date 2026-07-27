import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseRotationType, parseLocalDateString, recordShift } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";
import type { ShiftRow } from "@/lib/rotation-admin-data";

const shiftSchema = z.object({
  effectiveDate: z.string(),
  offsetPositions: z.number().int().refine((n) => n !== 0, "offsetPositions cannot be 0"),
  reason: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const rotationType = parseRotationType(params.type);
  if (!rotationType) return NextResponse.json({ error: "Invalid rotation type" }, { status: 400 });

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = shiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shift payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const effectiveDate = parseLocalDateString(parsed.data.effectiveDate);
  if (!effectiveDate) {
    return NextResponse.json({ error: "effectiveDate must be a valid YYYY-MM-DD date" }, { status: 400 });
  }

  try {
    const shift = await recordShift(rotationType, {
      effectiveDate,
      offsetPositions: parsed.data.offsetPositions,
      actorUserId: gate.user.id,
      reason: parsed.data.reason ?? undefined,
    });

    // recordShift() only returns { id } (its return contract is used by callers
    // that don't need the full row); reload it here so the client gets the
    // enriched row for immediate display without a second round-trip.
    const full = await prisma.rotationShift.findUnique({ where: { id: shift.id } });
    if (!full) return NextResponse.json({ error: "Shift recorded but could not be reloaded" }, { status: 500 });

    const actor = await prisma.user.findUnique({
      where: { id: full.actorUserId },
      include: { tenant: { select: { name: true } } },
    });

    const row: ShiftRow = {
      id: full.id,
      effectiveDate: full.effectiveDate.toISOString().split("T")[0],
      offsetPositions: full.offsetPositions,
      previousUnitLabel: full.previousUnitLabel,
      newUnitLabel: full.newUnitLabel,
      reason: full.reason,
      actorName: actor?.tenant?.name ?? "Admin",
      createdAt: full.createdAt.toISOString(),
    };

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to record shift";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
