import EventCalendar from "@/components/EventCalendar";
import MobileEventCalendar from "@/components/mobile/MobileEventCalendar";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { getTrashDutyTenants, getBathroomDutyTenants, getDishesDutyTenants } from "@/lib/duty-tenants";

const CalendarPage = async () => {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const isMobile = (await getViewMode()) === "mobile";

  const [trashTenantRows, bathroomTenantRows, dishesDutyTenantRows] = await Promise.all([
    getTrashDutyTenants(),
    getBathroomDutyTenants(),
    getDishesDutyTenants(),
  ]);

  const trashTenants = trashTenantRows.map((t) => t.name);
  const bathroomTenants = bathroomTenantRows.map((t) => t.name);
  const dishesTenants = dishesDutyTenantRows.map((t) => t.name);

  if (isMobile) {
    return (
      <MobileEventCalendar
        isAdmin={isAdmin}
        trashTenants={trashTenants}
        bathroomTenants={bathroomTenants}
        dishesTenants={dishesTenants}
      />
    );
  }

  return (
    <div className="p-4 flex justify-center">
      <div className="w-full max-w-lg">
        <EventCalendar
          isAdmin={isAdmin}
          trashTenants={trashTenants}
          bathroomTenants={bathroomTenants}
          dishesTenants={dishesTenants}
        />
      </div>
    </div>
  );
};

export default CalendarPage;
