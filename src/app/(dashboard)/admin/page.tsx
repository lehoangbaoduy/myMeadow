import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import DashboardContent from "@/components/DashboardContent";
import EventCalendar from "@/components/EventCalendar";
import ResidentCount from "@/components/ResidentCount";
import Annoucements from "@/components/Announcements";
import { getDishesDutyTenants } from "@/lib/dishes-duty";

const AdminPage = async () => {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

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

  const birthdays = (tenantDobs as { name: string; dob: Date | null }[])
    .filter((t): t is { name: string; dob: Date } => t.dob !== null)
    .map((t) => ({
      name: t.name,
      month: new Date(t.dob).getUTCMonth() + 1,
      day: new Date(t.dob).getUTCDate(),
    }));

  return (
    <div className="p-5 flex gap-5 flex-col md:flex-row">
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        <DashboardContent isAdmin={isAdmin} bills={bills} latestBill={latestBill} />
      </div>
      <div className="w-full lg:w-1/3 flex flex-col gap-5">
        <EventCalendar
          isAdmin={isAdmin}
          birthdays={birthdays}
          maleTenants={maleTenantRows.map((t) => t.name)}
          bathroomTenants={bathroomTenantRows.map((t) => t.name)}
          dishesTenants={dishesDutyTenantRows.map((t) => t.name)}
        />
        <ResidentCount />
        <Annoucements isAdmin={isAdmin} />
      </div>
    </div>
  );
};

export default AdminPage;
