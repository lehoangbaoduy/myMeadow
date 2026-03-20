import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bills = await prisma.utilityBill.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  return NextResponse.json(bills);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    month, year,
    electric, electricUsage, electricPrice,
    gas, gasUsage, gasPrice,
    water, waterUsage, waterPrice,
    wifi, wifiPrice,
  } = body;

  if (!month || !year) {
    return NextResponse.json({ error: "month and year are required" }, { status: 400 });
  }

  const fields = {
    ...(electric !== undefined && { electric }),
    ...(electricUsage !== undefined && { electricUsage }),
    ...(electricPrice !== undefined && { electricPrice }),
    ...(gas !== undefined && { gas }),
    ...(gasUsage !== undefined && { gasUsage }),
    ...(gasPrice !== undefined && { gasPrice }),
    ...(water !== undefined && { water }),
    ...(waterUsage !== undefined && { waterUsage }),
    ...(waterPrice !== undefined && { waterPrice }),
    ...(wifi !== undefined && { wifi }),
    ...(wifiPrice !== undefined && { wifiPrice }),
  };

  const bill = await prisma.utilityBill.upsert({
    where: { month_year: { month, year } },
    update: fields,
    create: { month, year, ...fields },
  });

  return NextResponse.json(bill, { status: 201 });
}
