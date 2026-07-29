import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { imageId: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const image = await prisma.roomImage.findUnique({
    where: { id: Number(params.imageId) },
    select: { imageData: true, imageMimeType: true },
  });
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(image.imageData, {
    headers: {
      "Content-Type": image.imageMimeType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
