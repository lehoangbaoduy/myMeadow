import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";

// Inline SVG icon components
const InventoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const ManagementIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const PersonalInventoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7h-3V6a4 4 0 0 0-8 0v1H6a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1Z" />
    <path d="M9 11v2" /><path d="M15 11v2" />
  </svg>
);

const RotationsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);

const MaintenanceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const RoomsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5 12 3l9 6.5" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const PolicyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h6M9 16h6M9 8h6" />
    <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
  </svg>
);

type MenuItem = {
  label: string;
  href: string;
  visible: string[];
} & (
  | { icon: string; svgIcon?: never }
  | { icon?: never; svgIcon: () => JSX.Element }
);

const menuItems: { title: string; items: MenuItem[] }[] = [
  {
    title: "MENU",
    items: [
      { icon: "/home.png",    label: "Dashboard",  href: "/admin",            visible: ["ADMIN"] },
      { icon: "/home.png",    label: "MyHome",     href: "/residents",        visible: ["TENANT"] },
      { icon: "/student.png", label: "Residents",  href: "/list/residents",   visible: ["ADMIN"] },
      { icon: "/setting.png", label: "Utilities",  href: "/utilities",        visible: ["ADMIN", "TENANT"] },
      { svgIcon: InventoryIcon, label: "Inventory",  href: "/kitchen-inventory",visible: ["ADMIN", "TENANT"] },
      { svgIcon: PersonalInventoryIcon, label: "My Inventory", href: "/personal-inventory", visible: ["ADMIN", "TENANT"] },
      { svgIcon: RotationsIcon, label: "Rotations",  href: "/admin/rotations", visible: ["ADMIN"] },
      { svgIcon: MaintenanceIcon, label: "Maintenance", href: "/admin/maintenance", visible: ["ADMIN"] },
      { svgIcon: RoomsIcon, label: "Room Layout", href: "/admin/rooms", visible: ["ADMIN"] },
      { svgIcon: ManagementIcon, label: "Management", href: "/management",    visible: ["ADMIN"] },
      { svgIcon: PolicyIcon, label: "House Policy", href: "/policy", visible: ["ADMIN", "TENANT"] },
    ],
  },
  {
    title: "OTHER",
    items: [
      { icon: "/profile.png", label: "Profile", href: "/profile", visible: ["ADMIN", "TENANT"] },
    ],
  },
];

const Menu = async () => {
  const currentUser = await getCurrentUser();
  const role = currentUser?.role ?? "TENANT";

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((menuItem) => (
        <div className="flex flex-col gap-2" key={menuItem.title}>
          <span className="hidden lg:block text-gray-400 dark:text-gray-500 font-light my-4">
            {menuItem.title}
          </span>
          {menuItem.items.map((item) => {
            if (!item.visible.includes(role)) return null;
            return (
              <Link
                href={item.href}
                key={item.label}
                className="flex items-center justify-center lg:justify-start gap-3 text-gray-500 dark:text-gray-400 py-2.5 md:px-3 rounded-xl hover:bg-meadowMuted dark:hover:bg-darkCard hover:text-gray-800 dark:hover:text-gray-200 transition-all text-sm font-medium"
              >
                {item.svgIcon ? (
                  <item.svgIcon />
                ) : (
                  <Image src={item.icon!} alt="" width={20} height={20} />
                )}
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
