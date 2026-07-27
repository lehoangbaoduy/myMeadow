import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().finite().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  expirationDate: z.string().datetime().nullable().optional(),
  lowStockThreshold: z.number().finite().nullable().optional(),
});

const itemWithSharesInclude = {
  shares: { include: { tenant: { select: { id: true, name: true } } } },
};

function serializeOwnItem(item: {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  description: string | null;
  expirationDate: Date | null;
  lowStockThreshold: number | null;
  shares: { tenant: { id: number; name: string } }[];
}) {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    description: item.description,
    expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null,
    lowStockThreshold: item.lowStockThreshold,
    sharedWith: item.shares.map((s) => ({ tenantId: s.tenant.id, name: s.tenant.name })),
  };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (caller.role === "ADMIN") {
    const tenantIdParam = req.nextUrl.searchParams.get("tenantId");
    if (tenantIdParam) {
      const items = await prisma.personalInventoryItem.findMany({
        where: { tenantId: Number(tenantIdParam) },
        orderBy: { name: "asc" },
        include: itemWithSharesInclude,
      });
      return NextResponse.json({ own: items.map(serializeOwnItem), sharedWithMe: [] });
    }
  }

  if (!caller.tenant?.id) return NextResponse.json({ own: [], sharedWithMe: [] });

  const [items, sharedRows] = await Promise.all([
    prisma.personalInventoryItem.findMany({
      where: { tenantId: caller.tenant.id },
      orderBy: { name: "asc" },
      include: itemWithSharesInclude,
    }),
    prisma.personalInventoryShare.findMany({
      where: { tenantId: caller.tenant.id },
      include: { item: { include: { tenant: { select: { id: true, name: true } } } } },
      orderBy: { item: { name: "asc" } },
    }),
  ]);

  const sharedWithMe = sharedRows.map((s) => ({
    id: s.item.id,
    name: s.item.name,
    quantity: s.item.quantity,
    unit: s.item.unit,
    category: s.item.category,
    description: s.item.description,
    expirationDate: s.item.expirationDate ? s.item.expirationDate.toISOString() : null,
    lowStockThreshold: s.item.lowStockThreshold,
    ownerTenantId: s.item.tenant.id,
    ownerName: s.item.tenant.name,
  }));

  return NextResponse.json({ own: items.map(serializeOwnItem), sharedWithMe });
}

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
    const item = await prisma.personalInventoryItem.create({
      data: {
        tenantId: caller.tenant.id,
        name: parsed.data.name,
        quantity: parsed.data.quantity ?? null,
        unit: parsed.data.unit ?? null,
        category: parsed.data.category ?? null,
        description: parsed.data.description ?? null,
        expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
        lowStockThreshold: parsed.data.lowStockThreshold ?? null,
      },
    });
    return NextResponse.json(serializeOwnItem({ ...item, shares: [] }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "You already have an item with this name" }, { status: 409 });
  }
}
