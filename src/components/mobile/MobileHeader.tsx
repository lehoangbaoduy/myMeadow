import Image from "next/image";
import { getHeaderUserInfo } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import NavbarUserMenu from "@/components/NavbarUserMenu";

const MobileHeader = async () => {
  const { name, role, avatarUrl, initial } = await getHeaderUserInfo();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 bg-white/95 dark:bg-darkSurface/95 backdrop-blur-sm border-b border-meadowBorder dark:border-darkBorder">
      <div className="flex items-center gap-2 min-w-0">
        <Image src="/logo.png" alt="MyMeadow" width={28} height={28} className="flex-shrink-0" />
        <span className="font-extrabold text-gray-900 dark:text-white tracking-tight truncate">MyMeadow</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle />
        <NotificationBell />
        <NavbarUserMenu userName={name} userRole={role} avatarUrl={avatarUrl} tenantInitial={initial} viewMode="mobile" />
      </div>
    </header>
  );
};

export default MobileHeader;
