import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { attachLastRestocks, serializeItem } from "@/lib/inventory-history";

const DEFAULT_ITEMS = [
  { name: "Fish Sauce",         category: "Cooking",   icon: "🐟" },
  { name: "Sugar",              category: "Cooking",   icon: "🍚" },
  { name: "Seasoning Powder",   category: "Cooking",   icon: "🧂" },
  { name: "Soy Sauce",          category: "Cooking",   icon: "🍶" },
  { name: "Oyster Sauce",       category: "Cooking",   icon: "🦪" },
  { name: "Cooking Oil",        category: "Cooking",   icon: "🫙" },
  { name: "Salt",               category: "Cooking",   icon: "🧂" },
  { name: "Paper Towel",        category: "Household", icon: "🧻" },
  { name: "Paper Tissue",       category: "Household", icon: "🤧" },
  { name: "Clorox",             category: "Cleaning",  icon: "🧴" },
  { name: "Alcohol",            category: "Cleaning",  icon: "💊" },
  { name: "Dish Soap",          category: "Cleaning",  icon: "🫧" },
  { name: "Sponge",             category: "Cleaning",  icon: "🧽" },
  { name: "Hand Wash",          category: "Cleaning",  icon: "🧼" },
  { name: "Detergent",          category: "Laundry",   icon: "👕" },
  { name: "Fabric Softener",    category: "Laundry",   icon: "🌸" },
  { name: "Multi-Purpose Spray",category: "Cleaning",  icon: "🚿" },
];

async function ensureDefaults() {
  for (const item of DEFAULT_ITEMS) {
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      update: {},
      create: { name: item.name, category: item.category, icon: item.icon, level: 1.0 },
    });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDefaults();

  const items = await prisma.inventoryItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json(await attachLastRestocks(items));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, category } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const item = await prisma.inventoryItem.create({
    data: { name, category: category || "Custom", icon: "📦", isCustom: true },
  });
  return NextResponse.json(serializeItem(item, null), { status: 201 });
}
