import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/DashboardContent";
import EventCalendar from "@/components/EventCalendar";
import ResidentCount from "@/components/ResidentCount";
import Annoucements from "@/components/Announcements";
import { getDishesDutyTenants } from "@/lib/dishes-duty";

const ResidentsPage = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const [bills, tenantDobs, maleTenantRows, bathroomTenantRows, dishesDutyTenantRows] = await Promise.all([
    prisma.utilityBill.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.tenant.findMany({
      where: { isActive: true, dob: { not: null } },
      select: { name: true, dob: true },
    }),
    prisma.tenant.findMany({
      where: { gender: "MALE", isActive: true },
      orderBy: { id: "asc" },
      select: { name: true },
    }),
    prisma.tenant.findMany({
      where: { bathroomDuty: true, isActive: true },
      orderBy: { id: "asc" },
      select: { name: true },
    }),
    getDishesDutyTenants(),
  ]);

  const latestBill = bills.length > 0 ? bills[bills.length - 1] : null;

  const birthdays = tenantDobs
    .filter((t): t is { name: string; dob: Date } => t.dob !== null)
    .map((t) => ({
      name: t.name,
      month: new Date(t.dob).getUTCMonth() + 1,
      day: new Date(t.dob).getUTCDate(),
    }));

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        <DashboardContent isAdmin={false} bills={bills} latestBill={latestBill} />
      </div>
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendar
          isAdmin={false}
          birthdays={birthdays}
          maleTenants={maleTenantRows.map((t) => t.name)}
          bathroomTenants={bathroomTenantRows.map((t) => t.name)}
          dishesTenants={dishesDutyTenantRows.map((t) => t.name)}
        />
        <ResidentCount />
        <Annoucements />
      </div>
    </div>
  );
};

export default ResidentsPage;
