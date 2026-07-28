import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!caller.tenant?.id) return NextResponse.json({ error: "No tenant profile linked" }, { status: 400 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const list = await prisma.personalInventoryList.create({
      data: { tenantId: caller.tenant.id, name: parsed.data.name },
    });
    return NextResponse.json({ id: list.id, name: list.name, items: [], sharedWith: [] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "You already have a list with this name" }, { status: 409 });
  }
}
