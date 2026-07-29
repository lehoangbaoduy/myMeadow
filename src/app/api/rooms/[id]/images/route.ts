import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin(clerkId: string) {
  const caller = await prisma.user.findUnique({ where: { clerkId } });
  return caller?.role === "ADMIN" ? caller : null;
}

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roomId = Number(params.id);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images allowed" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const last = await prisma.roomImage.findFirst({ where: { roomId }, orderBy: { order: "desc" }, select: { order: true } });
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await prisma.roomImage.create({
    data: { roomId, imageData: buffer, imageMimeType: file.type, order: (last?.order ?? -1) + 1 },
    select: { id: true, order: true },
  });

  return NextResponse.json(image, { status: 201 });
}
