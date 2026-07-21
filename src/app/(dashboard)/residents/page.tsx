import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/DashboardContent";
import EventCalendar from "@/components/EventCalendar";
import ResidentCount from "@/components/ResidentCount";
import Annoucements from "@/components/Announcements";
import MobileDashboardContent from "@/components/mobile/MobileDashboardContent";
import MobileEventCalendar from "@/components/mobile/MobileEventCalendar";
import MobileResidentCount from "@/components/mobile/MobileResidentCount";
import { getTrashDutyTenants, getBathroomDutyTenants, getDishesDutyTenants } from "@/lib/duty-tenants";

const ResidentsPage = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  const isMobile = (await getViewMode()) === "mobile";

  const [bills, tenantDobs, trashTenantRows, bathroomTenantRows, dishesDutyTenantRows, runOutItems] = await Promise.all([
    prisma.utilityBill.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.tenant.findMany({
      where: { isActive: true, dob: { not: null } },
      select: { name: true, dob: true },
    }),
    getTrashDutyTenants(),
    getBathroomDutyTenants(),
    getDishesDutyTenants(),
    prisma.inventoryRunOut.findMany({ where: { resolved: false }, orderBy: { reportedAt: "desc" } }),
  ]);

  const latestBill = bills.length > 0 ? bills[bills.length - 1] : null;

  const birthdays = tenantDobs
    .filter((t): t is { name: string; dob: Date } => t.dob !== null)
    .map((t) => ({
      name: t.name,
      month: new Date(t.dob).getUTCMonth() + 1,
      day: new Date(t.dob).getUTCDate(),
    }));

  const trashTenants = trashTenantRows.map((t) => t.name);
  const bathroomTenants = bathroomTenantRows.map((t) => t.name);
  const dishesTenants = dishesDutyTenantRows.map((t) => t.name);

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <MobileDashboardContent
          bills={bills}
          trashTenants={trashTenants}
          bathroomTenants={bathroomTenants}
          runOutItems={runOutItems.map((r) => ({ id: r.id, itemName: r.itemName }))}
        />
        <MobileEventCalendar
          isAdmin={false}
          birthdays={birthdays}
          trashTenants={trashTenants}
          bathroomTenants={bathroomTenants}
          dishesTenants={dishesTenants}
        />
        <MobileResidentCount />
        <Annoucements />
      </div>
    );
  }

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        <DashboardContent isAdmin={false} bills={bills} latestBill={latestBill} />
      </div>
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendar
          isAdmin={false}
          birthdays={birthdays}
          trashTenants={trashTenants}
          bathroomTenants={bathroomTenants}
          dishesTenants={dishesTenants}
        />
        <ResidentCount />
        <Annoucements />
      </div>
    </div>
  );
};

export default ResidentsPage;
