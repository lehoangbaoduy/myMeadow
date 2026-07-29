import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { redirect } from "next/navigation";
import { PLACEHOLDER_CLERK_PREFIX } from "@/lib/tenant-placeholder";
import ManagementClient from "./ManagementClient";
import MobileManagementClient from "@/components/mobile/MobileManagementClient";

export default async function ManagementPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  // Placeholders (vacant reserved rooms, no real resident) contribute no
  // rent income and are excluded here — unlike the utility bill split,
  // which does count them toward shared costs of a reserved room.
  const tenantRows = await prisma.tenant.findMany({
    where: { user: { clerkId: { not: { startsWith: PLACEHOLDER_CLERK_PREFIX } } } },
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
