import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import type { UtilityDocument } from "@prisma/client";
import { redirect } from "next/navigation";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";
import UtilitiesClient from "./UtilitiesClient";
import MobileUtilitiesClient from "@/components/mobile/MobileUtilitiesClient";

const now = new Date();

export default async function UtilitiesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const isAdmin = currentUser.role === "ADMIN";

  const [bills, rawDocuments, shareTenantRows] = await Promise.all([
    prisma.utilityBill.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.utilityDocument.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
    // All residents are fetched (not just currently-active) so the client can
    // resolve, per viewed billing period, who was actually active back then —
    // see isActiveForPeriod. Placeholders always count toward the split.
    prisma.tenant.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true, name: true, utilityShare: true, isActive: true, deactivatedAt: true,
        user: { select: { clerkId: true } },
      },
    }),
  ]);

  const shareTenants = shareTenantRows.map(({ user, deactivatedAt, ...tenant }) => ({
    ...tenant,
    deactivatedAt: deactivatedAt ? deactivatedAt.toISOString() : null,
    isPlaceholder: isPlaceholderClerkId(user.clerkId),
  }));

  const documents = rawDocuments.map((d: UtilityDocument) => ({
    ...d,
    billStartDate: d.billStartDate ? d.billStartDate.toISOString() : null,
    billEndDate: d.billEndDate ? d.billEndDate.toISOString() : null,
  }));

  const tenantName = currentUser.name ?? null;
  const isMobile = (await getViewMode()) === "mobile";
  const Client = isMobile ? MobileUtilitiesClient : UtilitiesClient;

  return (
    <Client
      isAdmin={isAdmin}
      bills={bills}
      documents={documents}
      tenantName={tenantName}
      tenantId={currentUser.tenantId}
      tenants={shareTenants}
      currentMonth={now.getMonth() + 1}
      currentYear={now.getFullYear()}
    />
  );
}
