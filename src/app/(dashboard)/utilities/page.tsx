import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UtilitiesClient from "./UtilitiesClient";

const now = new Date();

export default async function UtilitiesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const isAdmin = currentUser.role === "ADMIN";

  const [bills, rawDocuments] = await Promise.all([
    prisma.utilityBill.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.utilityDocument.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
  ]);

  const documents = rawDocuments.map((d) => ({
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
      currentMonth={now.getMonth() + 1}
      currentYear={now.getFullYear()}
    />
  );
}
