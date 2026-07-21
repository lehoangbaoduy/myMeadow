import EventCalendar from "@/components/EventCalendar";
import MobileEventCalendar from "@/components/mobile/MobileEventCalendar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { getDishesDutyTenants } from "@/lib/dishes-duty";

const CalendarPage = async () => {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const isMobile = (await getViewMode()) === "mobile";

  const [maleTenantRows, bathroomTenantRows, dishesDutyTenantRows] = await Promise.all([
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

  if (isMobile) {
    return (
      <MobileEventCalendar
        isAdmin={isAdmin}
        maleTenants={maleTenantRows.map((t) => t.name)}
        bathroomTenants={bathroomTenantRows.map((t) => t.name)}
        dishesTenants={dishesDutyTenantRows.map((t) => t.name)}
      />
    );
  }

  return (
    <div className="p-4 flex justify-center">
      <div className="w-full max-w-lg">
        <EventCalendar
          isAdmin={isAdmin}
          maleTenants={maleTenantRows.map((t) => t.name)}
          bathroomTenants={bathroomTenantRows.map((t) => t.name)}
          dishesTenants={dishesDutyTenantRows.map((t) => t.name)}
        />
      </div>
    </div>
  );
};

export default CalendarPage;
