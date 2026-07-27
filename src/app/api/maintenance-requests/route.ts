import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = caller.tenant?.id;
  if (!tenantId) return NextResponse.json({ error: "No tenant profile linked" }, { status: 400 });

  const body = await req.json();
  const { name, requestType, description } = body;

  if (!name || !requestType || !description) {
    return NextResponse.json({ error: "name, requestType, and description are required" }, { status: 400 });
  }

  const request = await prisma.maintenanceRequest.create({
    data: { tenantId, name, requestType, description },
  });

  return NextResponse.json(request, { status: 201 });
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
    const where = tenantIdParam ? { tenantId: Number(tenantIdParam) } : {};
    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  }

  if (!caller.tenant?.id) return NextResponse.json([]);

  const requests = await prisma.maintenanceRequest.findMany({
    where: { tenantId: caller.tenant.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}
