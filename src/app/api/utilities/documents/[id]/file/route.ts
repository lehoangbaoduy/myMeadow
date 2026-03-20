import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

  // Private blobs require the token as Bearer auth — stream through this route
  const blobRes = await fetch(doc.filePath, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!blobRes.ok) {
    return NextResponse.json({ error: "File unavailable" }, { status: blobRes.status });
  }

  return new NextResponse(blobRes.body, {
    headers: {
      "Content-Type": blobRes.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
    },
  });
}
