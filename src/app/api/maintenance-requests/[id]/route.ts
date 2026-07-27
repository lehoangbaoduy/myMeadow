import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "RESOLVED", "CANCELLED"]),
  resolutionNote: z.string().trim().min(1).nullable().optional(),
});

/** Which current statuses a target status may transition from. */
const ALLOWED_SOURCE_STATUSES: Record<string, string[]> = {
  APPROVED: ["PENDING"],
  REJECTED: ["PENDING"],
  RESOLVED: ["PENDING", "APPROVED"],
  CANCELLED: ["PENDING", "APPROVED"],
};

const TERMINAL_STATUSES = new Set(["REJECTED", "RESOLVED", "CANCELLED"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { status, resolutionNote } = parsed.data;
  const id = Number(params.id);

  const isTerminal = TERMINAL_STATUSES.has(status);
  const result = await prisma.maintenanceRequest.updateMany({
    where: { id, status: { in: ALLOWED_SOURCE_STATUSES[status] } },
    data: {
      status,
      ...(isTerminal && {
        resolvedByUserId: caller.id,
        resolvedAt: new Date(),
        resolutionNote: resolutionNote ?? null,
      }),
    },
  });

  if (result.count === 0) {
    const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { error: `Request is already ${existing.status.toLowerCase()} and cannot transition to ${status.toLowerCase()}` },
      { status: 409 }
    );
  }

  const updated = await prisma.maintenanceRequest.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
