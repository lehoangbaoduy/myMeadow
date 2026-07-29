import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

async function requireAdmin(clerkId: string) {
  const caller = await prisma.user.findUnique({ where: { clerkId } });
  return caller?.role === "ADMIN" ? caller : null;
}

const updateSchema = z.object({
  roomNumber: z.string().trim().min(1).optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const roomId = Number(params.id);
  if (parsed.data.roomNumber) {
    const existing = await prisma.room.findUnique({ where: { roomNumber: parsed.data.roomNumber } });
    if (existing && existing.id !== roomId) {
      return NextResponse.json({ error: "A room with that number already exists" }, { status: 409 });
    }
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(parsed.data.roomNumber !== undefined && { roomNumber: parsed.data.roomNumber }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.room.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
