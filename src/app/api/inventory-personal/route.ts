import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeListWrite } from "@/lib/personal-inventory-authz";

const createItemSchema = z.object({
  listId: z.number().int(),
  name: z.string().trim().min(1),
  quantity: z.number().finite().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  expirationDate: z.string().datetime().nullable().optional(),
  lowStockThreshold: z.number().finite().nullable().optional(),
});

const listWithItemsAndSharesInclude = {
  items: { orderBy: { name: "asc" as const } },
  shares: { include: { tenant: { select: { id: true, name: true } } } },
};

function serializeItem(item: {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  description: string | null;
  expirationDate: Date | null;
  lowStockThreshold: number | null;
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
  };
}

function serializeOwnList(list: {
  id: number;
  name: string;
  items: Parameters<typeof serializeItem>[0][];
  shares: { tenant: { id: number; name: string } }[];
}) {
  return {
    id: list.id,
    name: list.name,
    items: list.items.map(serializeItem),
    sharedWith: list.shares.map((s) => ({ tenantId: s.tenant.id, name: s.tenant.name })),
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
      const lists = await prisma.personalInventoryList.findMany({
        where: { tenantId: Number(tenantIdParam) },
        orderBy: { name: "asc" },
        include: listWithItemsAndSharesInclude,
      });
      return NextResponse.json({ ownLists: lists.map(serializeOwnList), sharedLists: [] });
    }
  }

  if (!caller.tenant?.id) return NextResponse.json({ ownLists: [], sharedLists: [] });

  const [lists, sharedRows] = await Promise.all([
    prisma.personalInventoryList.findMany({
      where: { tenantId: caller.tenant.id },
      orderBy: { name: "asc" },
      include: listWithItemsAndSharesInclude,
    }),
    prisma.personalInventoryListShare.findMany({
      where: { tenantId: caller.tenant.id },
      include: {
        list: { include: { tenant: { select: { id: true, name: true } }, items: { orderBy: { name: "asc" } } } },
      },
      orderBy: { list: { name: "asc" } },
    }),
  ]);

  const sharedLists = sharedRows.map((s) => ({
    id: s.list.id,
    name: s.list.name,
    items: s.list.items.map(serializeItem),
    ownerTenantId: s.list.tenant.id,
    ownerName: s.list.tenant.name,
  }));

  return NextResponse.json({ ownLists: lists.map(serializeOwnList), sharedLists });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createItemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const authz = await authorizeListWrite(userId, parsed.data.listId);
  if (authz instanceof NextResponse) return authz;

  try {
    const item = await prisma.personalInventoryItem.create({
      data: {
        listId: parsed.data.listId,
        name: parsed.data.name,
        quantity: parsed.data.quantity ?? null,
        unit: parsed.data.unit ?? null,
        category: parsed.data.category ?? null,
        description: parsed.data.description ?? null,
        expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
        lowStockThreshold: parsed.data.lowStockThreshold ?? null,
      },
    });
    return NextResponse.json(serializeItem(item), { status: 201 });
  } catch {
    return NextResponse.json({ error: "This list already has an item with this name" }, { status: 409 });
  }
}
