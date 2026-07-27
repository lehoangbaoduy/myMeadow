import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  date: z.string().min(1).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

async function requireAdminCaller(clerkId: string): Promise<NextResponse | { caller: { id: number } }> {
  const caller = await prisma.user.findUnique({ where: { clerkId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { caller };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authz = await requireAdminCaller(userId);
  if (authz instanceof NextResponse) return authz;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.announcement.update({
    where: { id: Number(params.id) },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  return NextResponse.json(updated);
}

/** Archives the announcement (global, admin-only) rather than hard-deleting it, so history is preserved. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authz = await requireAdminCaller(userId);
  if (authz instanceof NextResponse) return authz;

  await prisma.announcement.update({ where: { id: Number(params.id) }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ success: true });
}
