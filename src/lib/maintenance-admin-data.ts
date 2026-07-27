import { prisma } from "@/lib/prisma";

export interface MaintenanceRequestRow {
  id: number;
  tenantId: number;
  tenantName: string;
  name: string;
  requestType: string;
  description: string;
  status: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

/** PENDING/APPROVED first (needs attention), terminal statuses last. */
const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  APPROVED: 1,
  RESOLVED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

export async function getMaintenanceRequests(): Promise<MaintenanceRequestRow[]> {
  const requests = await prisma.maintenanceRequest.findMany({
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const resolverIds = Array.from(
    new Set(requests.map((r) => r.resolvedByUserId).filter((id): id is number => id !== null))
  );
  const resolvers =
    resolverIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: resolverIds } }, include: { tenant: { select: { name: true } } } })
      : [];
  const resolverNameById = new Map(resolvers.map((u) => [u.id, u.tenant?.name ?? "Admin"]));

  return requests
    .map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenant.name,
      name: r.name,
      requestType: r.requestType,
      description: r.description,
      status: r.status,
      resolvedByName: r.resolvedByUserId ? (resolverNameById.get(r.resolvedByUserId) ?? "Admin") : null,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      resolutionNote: r.resolutionNote,
      createdAt: r.createdAt.toISOString(),
    }))
    .sort((a, b) => {
      const orderDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
