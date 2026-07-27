import EventCalendar from "@/components/EventCalendar";
import MobileEventCalendar from "@/components/mobile/MobileEventCalendar";
import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { getTrashDutyRoster, getBathroomDutyRoster, getDishesDutyRoster } from "@/lib/duty-tenants";
import { getMostRecentCompletedTurn } from "@/lib/recent-completed-turn";

const CalendarPage = async () => {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const isMobile = (await getViewMode()) === "mobile";

  const [trashTenants, bathroomTenants, dishesTenants, recentCompletedTurn] = await Promise.all([
    getTrashDutyRoster(),
    getBathroomDutyRoster(),
    getDishesDutyRoster(),
    getMostRecentCompletedTurn(),
  ]);

  if (isMobile) {
    return (
      <MobileEventCalendar
        isAdmin={isAdmin}
        trashTenants={trashTenants}
        bathroomTenants={bathroomTenants}
        dishesTenants={dishesTenants}
        recentCompletedTurn={recentCompletedTurn}
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
          recentCompletedTurn={recentCompletedTurn}
        />
      </div>
    </div>
  );
};

export default CalendarPage;
