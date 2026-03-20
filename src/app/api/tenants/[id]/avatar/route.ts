import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function getCallerUser(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: { tenant: { select: { id: true } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(params.id) },
    select: { avatarData: true, avatarMimeType: true },
  });
  if (!tenant?.avatarData) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(tenant.avatarData, {
    headers: {
      "Content-Type": tenant.avatarMimeType ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await getCallerUser(userId);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = Number(params.id);
  const isAdmin = caller.role === "ADMIN";
  const isOwn = caller.tenant?.id === tenantId;
  if (!isAdmin && !isOwn) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images allowed" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { avatarData: buffer, avatarMimeType: file.type },
  });

  return NextResponse.json({ success: true });
}
