import { getCurrentUser } from "@/lib/auth";
import MobileHeader from "./MobileHeader";
import BottomTabBar from "./BottomTabBar";

export default async function MobileShell({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const role = currentUser?.role ?? "TENANT";

  return (
    <div className="min-h-screen flex flex-col bg-meadowLight dark:bg-darkBg">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] px-4 pt-4 flex flex-col gap-4">
        {children}
      </main>
      <BottomTabBar role={role} />
    </div>
  );
}
