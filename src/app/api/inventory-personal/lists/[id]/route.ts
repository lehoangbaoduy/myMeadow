import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeListWrite } from "@/lib/personal-inventory-authz";

const renameSchema = z.object({
  name: z.string().trim().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listId = Number(params.id);
  const authz = await authorizeListWrite(userId, listId);
  if (authz instanceof NextResponse) return authz;

  const parsed = renameSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.personalInventoryList.update({
      where: { id: listId },
      data: { name: parsed.data.name },
    });
    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch {
    return NextResponse.json({ error: "You already have a list with this name" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listId = Number(params.id);
  const authz = await authorizeListWrite(userId, listId);
  if (authz instanceof NextResponse) return authz;

  await prisma.personalInventoryList.delete({ where: { id: listId } });
  return NextResponse.json({ success: true });
}
