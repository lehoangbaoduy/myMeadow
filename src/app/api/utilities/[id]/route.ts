import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { electric, gas, water, wifi, electricUsage, gasUsage, waterUsage, electricPrice, gasPrice, waterPrice, wifiPrice } = body;

  const updated = await prisma.utilityBill.update({
    where: { id: Number(params.id) },
    data: {
      ...(electric !== undefined && { electric }),
      ...(gas !== undefined && { gas }),
      ...(water !== undefined && { water }),
      ...(wifi !== undefined && { wifi }),
      ...(electricUsage !== undefined && { electricUsage }),
      ...(gasUsage !== undefined && { gasUsage }),
      ...(waterUsage !== undefined && { waterUsage }),
      ...(electricPrice !== undefined && { electricPrice }),
      ...(gasPrice !== undefined && { gasPrice }),
      ...(waterPrice !== undefined && { waterPrice }),
      ...(wifiPrice !== undefined && { wifiPrice }),
    },
  });

  return NextResponse.json(updated);
}
