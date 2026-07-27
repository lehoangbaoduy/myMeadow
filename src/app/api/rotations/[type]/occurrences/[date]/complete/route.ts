import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseChoreTable, parseLocalDateString, ensureOccurrence } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";

function isValidOccurrenceDay(table: "TRASH" | "DISHES" | "BATHROOM", date: Date): boolean {
  if (table === "TRASH") return date.getDay() === 4;
  if (table === "DISHES") return date.getDay() === 5;
  const day = date.getDate();
  return day === 1 || day === 15;
}

const completeSchema = z.object({
  status: z.enum(["COMPLETED", "MISSED"]),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { type: string; date: string } }) {
  const table = parseChoreTable(params.type);
  if (!table) return NextResponse.json({ error: "Invalid chore table" }, { status: 400 });

  const date = parseLocalDateString(params.date);
  if (!date) return NextResponse.json({ error: "date must be a valid YYYY-MM-DD date" }, { status: 400 });

  if (!isValidOccurrenceDay(table, date)) {
    const expected = table === "TRASH" ? "a Thursday" : table === "DISHES" ? "a Friday" : "the 1st or 15th of the month";
    return NextResponse.json({ error: `date must be ${expected} for ${table}` }, { status: 400 });
  }

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  await ensureOccurrence(table, date);

  const updateData = {
    status: parsed.data.status,
    completedAt: new Date(),
    completedByUserId: gate.user.id,
    notes: parsed.data.notes ?? null,
  };

  if (table === "TRASH") {
    const updated = await prisma.trashAssignment.update({ where: { date }, data: updateData });
    return NextResponse.json(updated);
  }
  if (table === "DISHES") {
    const updated = await prisma.dishesAssignment.update({ where: { date }, data: updateData });
    return NextResponse.json(updated);
  }
  const updated = await prisma.bathroomAssignment.update({ where: { date }, data: updateData });
  return NextResponse.json(updated);
}
