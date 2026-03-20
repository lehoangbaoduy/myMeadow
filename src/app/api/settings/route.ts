import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json(); // { key: string, value: string }
  const { key, value } = body;

  const setting = await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return NextResponse.json(setting);
}
