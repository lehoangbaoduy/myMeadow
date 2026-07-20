import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { UtilityDocument } from "@prisma/client";
import { redirect } from "next/navigation";
import { isPlaceholderClerkId, PLACEHOLDER_CLERK_PREFIX } from "@/lib/tenant-placeholder";
import UtilitiesClient from "./UtilitiesClient";

const now = new Date();

export default async function UtilitiesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const isAdmin = currentUser.role === "ADMIN";

  const [bills, rawDocuments, shareTenantRows] = await Promise.all([
    prisma.utilityBill.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.utilityDocument.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
    // Active residents plus reserved placeholder rooms both count toward the split —
    // only genuinely inactive (moved-out) real residents are excluded.
    prisma.tenant.findMany({
      where: { OR: [{ isActive: true }, { user: { clerkId: { startsWith: PLACEHOLDER_CLERK_PREFIX } } }] },
      orderBy: { id: "asc" },
      select: { id: true, name: true, utilityShare: true, user: { select: { clerkId: true } } },
    }),
  ]);

  const shareTenants = shareTenantRows.map(({ user, ...tenant }) => ({
    ...tenant,
    isPlaceholder: isPlaceholderClerkId(user.clerkId),
  }));

  const documents = rawDocuments.map((d: UtilityDocument) => ({
    ...d,
    billStartDate: d.billStartDate ? d.billStartDate.toISOString() : null,
    billEndDate: d.billEndDate ? d.billEndDate.toISOString() : null,
  }));

  const tenantName = currentUser.name ?? null;

  return (
    <UtilitiesClient
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
