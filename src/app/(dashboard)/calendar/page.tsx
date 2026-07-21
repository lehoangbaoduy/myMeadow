import EventCalendar from "@/components/EventCalendar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDishesDutyTenants } from "@/lib/dishes-duty";

const CalendarPage = async () => {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

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
