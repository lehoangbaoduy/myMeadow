import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as {
    billStartDate?: string | null;
    billEndDate?: string | null;
  };

  const doc = await prisma.utilityDocument.update({
    where: { id },
    data: {
      billStartDate: body.billStartDate ? new Date(body.billStartDate) : null,
      billEndDate: body.billEndDate ? new Date(body.billEndDate) : null,
    },
  });

  return NextResponse.json(doc);
}
