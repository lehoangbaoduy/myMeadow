import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { redirect } from "next/navigation";
import ManagementClient from "./ManagementClient";
import MobileManagementClient from "@/components/mobile/MobileManagementClient";

export default async function ManagementPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  // All residents (including placeholders reserving a room) are fetched —
  // not just currently-active ones — so isActiveForPeriod can reconstruct
  // who actually contributed to a past period, matching the utility bill
  // split's per-period logic exactly.
  const tenantRows = await prisma.tenant.findMany({
    orderBy: { id: "asc" },
    select: { name: true, rentAmount: true, utilityShare: true, isActive: true, deactivatedAt: true },
  });
  const tenants = tenantRows.map((t) => ({
    ...t,
    deactivatedAt: t.deactivatedAt ? t.deactivatedAt.toISOString() : null,
  }));

  const isMobile = (await getViewMode()) === "mobile";
  return isMobile ? <MobileManagementClient tenants={tenants} /> : <ManagementClient tenants={tenants} />;
}
