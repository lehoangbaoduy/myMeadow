import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseRotationType } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

const createTeamSchema = z.object({
  name: z.string().min(1).optional().nullable(),
  tenantIds: z.array(z.number().int()).min(2, "a team needs at least 2 members"),
});

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const rotationType = parseRotationType(params.type);
  if (!rotationType) return NextResponse.json({ error: "Invalid rotation type" }, { status: 400 });

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const tenantIds = parsed.data.tenantIds;
  if (new Set(tenantIds).size !== tenantIds.length) {
    return NextResponse.json({ error: "tenantIds must not contain duplicates" }, { status: 400 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    include: { user: { select: { clerkId: true } } },
  });
  if (tenants.length !== tenantIds.length) {
    return NextResponse.json({ error: "One or more tenantIds do not exist" }, { status: 400 });
  }
  for (const t of tenants) {
    if (!t.isActive) {
      return NextResponse.json({ error: `Tenant ${t.name} is not active` }, { status: 400 });
    }
    if (isPlaceholderClerkId(t.user.clerkId)) {
      return NextResponse.json({ error: `Tenant ${t.name} is a placeholder and cannot join a rotation` }, { status: 400 });
    }
  }

  const existingSoloUnits = await prisma.rotationUnit.findMany({
    where: { rotationType, tenantId: { in: tenantIds } },
  });
  if (existingSoloUnits.length > 0) {
    return NextResponse.json(
      { error: "One or more tenants already occupy a solo roster slot for this rotation — remove them from the roster first" },
      { status: 400 }
    );
  }

  const existingMemberships = await prisma.rotationTeamMember.findMany({
    where: { rotationType, tenantId: { in: tenantIds } },
  });
  if (existingMemberships.length > 0) {
    return NextResponse.json(
      { error: "One or more tenants are already on a team for this rotation" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.rotationTeam.create({
      data: { rotationType, name: parsed.data.name ?? null },
    });
    await tx.rotationTeamMember.createMany({
      data: tenantIds.map((tenantId) => ({ teamId: team.id, rotationType, tenantId })),
    });
    const maxOrder = await tx.rotationUnit.aggregate({ where: { rotationType }, _max: { order: true } });
    const unit = await tx.rotationUnit.create({
      data: { rotationType, order: (maxOrder._max.order ?? -1) + 1, teamId: team.id },
    });
    return { team, unit };
  });

  return NextResponse.json(
    { teamId: result.team.id, unitId: result.unit.id, name: result.team.name, tenantIds },
    { status: 201 }
  );
}

const deleteTeamSchema = z.object({ teamId: z.number().int() });

export async function DELETE(req: NextRequest, { params }: { params: { type: string } }) {
  const rotationType = parseRotationType(params.type);
  if (!rotationType) return NextResponse.json({ error: "Invalid rotation type" }, { status: 400 });

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = deleteTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const team = await prisma.rotationTeam.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.rotationType !== rotationType) {
    return NextResponse.json({ error: "Team not found for this rotation" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.rotationUnit.deleteMany({ where: { teamId: team.id } }),
    prisma.rotationTeamMember.deleteMany({ where: { teamId: team.id } }),
    prisma.rotationTeam.delete({ where: { id: team.id } }),
  ]);

  return NextResponse.json({ success: true });
}
