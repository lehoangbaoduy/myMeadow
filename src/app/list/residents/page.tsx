import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { redirect } from "next/navigation";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";
import ResidentsClient from "./ResidentsClient";
import MobileResidentsClient from "@/components/mobile/MobileResidentsClient";

export default async function ResidentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  const tenantRows = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: { user: { select: { clerkId: true } } },
  });
  const tenants = tenantRows.map(({ user, ...tenant }) => ({
    ...tenant,
    isPlaceholder: isPlaceholderClerkId(user.clerkId),
  }));

  // Fetch pending maintenance request counts per tenant
  const pendingCounts = await prisma.maintenanceRequest.groupBy({
    by: ["tenantId"],
    where: { status: "PENDING" },
    _count: { id: true },
  });

  const pendingMap: Record<number, number> = {};
  for (const row of pendingCounts) {
    pendingMap[row.tenantId] = row._count.id;
  }

  const isMobile = (await getViewMode()) === "mobile";
  return isMobile
    ? <MobileResidentsClient tenants={tenants} pendingMap={pendingMap} />
    : <ResidentsClient tenants={tenants} pendingMap={pendingMap} />;
}
