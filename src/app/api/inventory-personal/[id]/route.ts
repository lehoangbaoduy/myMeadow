import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeItemWrite } from "@/lib/personal-inventory-authz";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  quantity: z.number().finite().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  expirationDate: z.string().datetime().nullable().optional(),
  lowStockThreshold: z.number().finite().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = Number(params.id);
  const authz = await authorizeItemWrite(userId, itemId);
  if (authz instanceof NextResponse) return authz;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const updated = await prisma.personalInventoryItem.update({
      where: { id: itemId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.expirationDate !== undefined && {
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        }),
        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "You already have an item with this name" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = Number(params.id);
  const authz = await authorizeItemWrite(userId, itemId);
  if (authz instanceof NextResponse) return authz;

  await prisma.personalInventoryItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
