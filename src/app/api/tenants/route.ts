import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { makePlaceholderClerkId } from "@/lib/tenant-placeholder";

async function getRole(clerkId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  return user?.role ?? null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: { user: { select: { role: true } } },
  });

  return NextResponse.json(tenants);
}

const createPlaceholderSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]),
  dob: z.string().optional().nullable(),
  roomNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  rentAmount: z.number().finite().nonnegative().optional().nullable(),
  bathroomDuty: z.boolean().optional(),
  dishesDuty: z.boolean().optional(),
  trashDuty: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getRole(userId);
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createPlaceholderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid resident data", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, gender, dob, roomNumber, notes, rentAmount, bathroomDuty, dishesDuty, trashDuty } = parsed.data;

  // This endpoint always creates a placeholder resident (a reserved room slot with no
  // real Clerk login). It's kept inactive by default so it never counts as an "active
  // resident" and never receives rent reminders — but it still enters the trash/bathroom/
  // dishes rotation whenever the corresponding duty flag is ticked, same as a real tenant.
  const placeholderUser = await prisma.user.create({
    data: { clerkId: makePlaceholderClerkId(), role: "TENANT" },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name,
      dob: dob ? new Date(dob) : null,
      gender,
      roomNumber: roomNumber ?? null,
      notes: notes ?? null,
      rentAmount: rentAmount ?? null,
      bathroomDuty: bathroomDuty ?? false,
      dishesDuty: dishesDuty ?? true,
      trashDuty: trashDuty ?? false,
      isActive: false,
      userId: placeholderUser.id,
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
