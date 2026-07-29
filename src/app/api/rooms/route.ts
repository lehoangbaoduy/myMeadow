import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRoomsAdminData } from "@/lib/rooms-admin-data";

async function requireAdmin(clerkId: string) {
  const caller = await prisma.user.findUnique({ where: { clerkId } });
  return caller?.role === "ADMIN" ? caller : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getRoomsAdminData();
  return NextResponse.json(data);
}

const createSchema = z.object({
  roomNumber: z.string().trim().min(1),
  notes: z.string().trim().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "roomNumber is required" }, { status: 400 });

  const existing = await prisma.room.findUnique({ where: { roomNumber: parsed.data.roomNumber } });
  if (existing) return NextResponse.json({ error: "A room with that number already exists" }, { status: 409 });

  const room = await prisma.room.create({
    data: { roomNumber: parsed.data.roomNumber, notes: parsed.data.notes || null },
  });

  return NextResponse.json({ ...room, images: [], assignedTenants: [] }, { status: 201 });
}
