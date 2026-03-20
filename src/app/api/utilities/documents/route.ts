import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.utilityDocument.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const utilityType = formData.get("utilityType") as string;
  const billStartRaw = formData.get("billStartDate") as string | null;
  const billEndRaw = formData.get("billEndDate") as string | null;
  const billStartDate = billStartRaw ? new Date(billStartRaw) : null;
  const billEndDate = billEndRaw ? new Date(billEndRaw) : null;

  if (!file || !month || !year || !utilityType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 20MB" }, { status: 400 });
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobKey = `utility-docs/${year}-${String(month).padStart(2, "0")}-${utilityType}-${Date.now()}-${sanitizedName}`;

  const blob = await put(blobKey, file, { access: "private" });

  // Remove old file if exists
  const existing = await prisma.utilityDocument.findUnique({
    where: { month_year_utilityType: { month, year, utilityType } },
  });
  if (existing) {
    try { await del(existing.filePath); } catch { /* ignore if blob missing */ }
  }

  const doc = await prisma.utilityDocument.upsert({
    where: { month_year_utilityType: { month, year, utilityType } },
    update: { fileName: file.name, filePath: blob.url, billStartDate, billEndDate },
    create: { month, year, utilityType, fileName: file.name, filePath: blob.url, billStartDate, billEndDate },
  });

  return NextResponse.json(doc, { status: 201 });
}
