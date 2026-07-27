import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseRotationType, unitLabel } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

const unitInclude = {
  tenant: { select: { id: true, name: true } },
  team: { include: { members: { include: { tenant: { select: { id: true, name: true } } } } } },
};

export async function GET(_req: NextRequest, { params }: { params: { type: string } }) {
  const rotationType = parseRotationType(params.type);
  if (!rotationType) return NextResponse.json({ error: "Invalid rotation type" }, { status: 400 });

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const units = await prisma.rotationUnit.findMany({
    where: { rotationType },
    orderBy: { order: "asc" },
    include: unitInclude,
  });

  return NextResponse.json(
    units.map((u) => ({
      id: u.id,
      order: u.order,
      tenantId: u.tenantId,
      teamId: u.teamId,
      label: unitLabel(u),
      members: u.team
        ? u.team.members.map((m) => ({ tenantId: m.tenant.id, name: m.tenant.name }))
        : u.tenant
          ? [{ tenantId: u.tenant.id, name: u.tenant.name }]
          : [],
    }))
  );
}

const rosterPutSchema = z.object({
  units: z.array(z.union([z.object({ unitId: z.number().int() }), z.object({ tenantId: z.number().int() })])),
});

export async function PUT(req: NextRequest, { params }: { params: { type: string } }) {
  const rotationType = parseRotationType(params.type);
  if (!rotationType) return NextResponse.json({ error: "Invalid rotation type" }, { status: 400 });

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = rosterPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid roster payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.rotationUnit.findMany({ where: { rotationType } });
  const existingById = new Map(existing.map((u) => [u.id, u]));

  const seenUnitIds = new Set<number>();
  const seenTenantIds = new Set<number>();
  for (const item of parsed.data.units) {
    if ("unitId" in item) {
      if (seenUnitIds.has(item.unitId)) {
        return NextResponse.json({ error: `unitId ${item.unitId} listed more than once` }, { status: 400 });
      }
      seenUnitIds.add(item.unitId);
      if (!existingById.has(item.unitId)) {
        return NextResponse.json({ error: `unitId ${item.unitId} does not belong to this rotation` }, { status: 400 });
      }
    } else {
      if (seenTenantIds.has(item.tenantId)) {
        return NextResponse.json({ error: `tenantId ${item.tenantId} listed more than once` }, { status: 400 });
      }
      seenTenantIds.add(item.tenantId);
      const alreadyRostered = existing.find((u) => u.tenantId === item.tenantId);
      if (alreadyRostered) {
        return NextResponse.json(
          {
            error: `tenant ${item.tenantId} is already on this roster as unitId ${alreadyRostered.id} — reference it by unitId to reorder instead of re-adding it`,
          },
          { status: 400 }
        );
      }
    }
  }

  const tenantIdsToAdd = parsed.data.units
    .filter((u): u is { tenantId: number } => "tenantId" in u)
    .map((u) => u.tenantId);

  if (tenantIdsToAdd.length > 0) {
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIdsToAdd } },
      include: { user: { select: { clerkId: true } } },
    });
    if (tenants.length !== tenantIdsToAdd.length) {
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
  }

  // Units currently rostered but absent from the new list are being removed.
  // Team units are excluded — disbanding a team is DELETE /teams's job, so an
  // admin can't accidentally strand a RotationTeam by omitting it here.
  const removedUnits = existing.filter((u) => !seenUnitIds.has(u.id));
  const removedTeamUnit = removedUnits.find((u) => u.teamId !== null);
  if (removedTeamUnit) {
    return NextResponse.json(
      {
        error: `unitId ${removedTeamUnit.id} is a team — disband it via DELETE /api/rotations/${params.type}/teams instead of omitting it here`,
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (removedUnits.length > 0) {
      await tx.rotationUnit.deleteMany({ where: { id: { in: removedUnits.map((u) => u.id) } } });
    }

    // Two-phase reorder: bump kept units to a disjoint high range first so
    // intermediate writes never collide with @@unique([rotationType, order])
    // against another kept unit's current or future position.
    const keptExisting = parsed.data.units
      .map((item, index) => ("unitId" in item ? { unitId: item.unitId, index } : null))
      .filter((x): x is { unitId: number; index: number } => x !== null);

    for (const { unitId, index } of keptExisting) {
      await tx.rotationUnit.update({ where: { id: unitId }, data: { order: index + 100000 } });
    }

    for (let i = 0; i < parsed.data.units.length; i++) {
      const item = parsed.data.units[i];
      if ("unitId" in item) {
        await tx.rotationUnit.update({ where: { id: item.unitId }, data: { order: i } });
      } else {
        await tx.rotationUnit.create({ data: { rotationType, order: i, tenantId: item.tenantId } });
      }
    }

    return tx.rotationUnit.findMany({ where: { rotationType }, orderBy: { order: "asc" }, include: unitInclude });
  });

  return NextResponse.json(
    result.map((u) => ({
      id: u.id,
      order: u.order,
      tenantId: u.tenantId,
      teamId: u.teamId,
      label: unitLabel(u),
      members: u.team
        ? u.team.members.map((m) => ({ tenantId: m.tenant.id, name: m.tenant.name }))
        : u.tenant
          ? [{ tenantId: u.tenant.id, name: u.tenant.name }]
          : [],
    }))
  );
}
