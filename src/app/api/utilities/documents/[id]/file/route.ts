import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@vercel/blob";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.utilityDocument.findUnique({
    where: { id: Number(params.id) },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const downloadUrl = await getDownloadUrl(doc.filePath);
  return NextResponse.redirect(downloadUrl);
}
