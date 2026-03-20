import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import NavbarUserMenu from "./NavbarUserMenu";

const Navbar = async () => {
  const currentUser = await getCurrentUser();

  // Fetch avatar if tenant has one
  let avatarUrl: string | null = null;
  if (currentUser?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      select: { avatarData: true },
    });
    if (tenant?.avatarData) {
      avatarUrl = `/api/tenants/${currentUser.tenantId}/avatar`;
    }
  }

  const name = currentUser?.name ?? "Guest";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-darkSurface border-b border-meadowBorder dark:border-darkBorder sticky top-0 z-40 backdrop-blur-sm bg-white/95 dark:bg-darkSurface/95">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2.5 text-xs rounded-lg border border-meadowBorder dark:border-darkBorder px-3 py-2 bg-meadowLight dark:bg-darkCard min-w-[220px] focus-within:ring-2 focus-within:ring-meadowOrange/30 focus-within:border-meadowOrange/50 transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search..."
          className="w-full bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 text-sm"
        />
      </div>

      {/* ICONS AND USER */}
      <div className="flex items-center gap-3 justify-end w-full">
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-meadowBorder dark:bg-darkBorder" />
        <div className="flex flex-col text-right">
          <span className="text-sm leading-tight font-semibold text-gray-900 dark:text-gray-100">
            {name}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
            {currentUser?.role === "ADMIN" ? "Administrator" : "Tenant"}
          </span>
        </div>
        <NavbarUserMenu
          userName={name}
          userRole={currentUser?.role ?? "TENANT"}
          avatarUrl={avatarUrl}
          tenantInitial={initial}
        />
      </div>
    </div>
  );
};

export default Navbar;
