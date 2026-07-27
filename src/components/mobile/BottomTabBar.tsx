"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import MobileBottomSheet from "./MobileBottomSheet";

const CalendarIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const InventoryIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const ManagementIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const PersonalInventoryIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7h-3V6a4 4 0 0 0-8 0v1H6a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1Z" />
    <path d="M9 11v2" /><path d="M15 11v2" />
  </svg>
);

const RotationsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);

const MoreIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

interface Props {
  role: "ADMIN" | "TENANT";
}

interface Tab {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function BottomTabBar({ role }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const homeHref = role === "ADMIN" ? "/admin" : "/residents";

  const tabs: Tab[] = [
    { label: "Home", href: homeHref, icon: <Image src="/home.png" alt="" width={21} height={21} /> },
    { label: "Calendar", href: "/calendar", icon: <CalendarIcon /> },
    { label: "Utilities", href: "/utilities", icon: <Image src="/setting.png" alt="" width={21} height={21} /> },
    { label: "Inventory", href: "/kitchen-inventory", icon: <InventoryIcon /> },
  ];

  const moreItems: Tab[] = [
    ...(role === "ADMIN"
      ? [
          { label: "Residents", href: "/list/residents", icon: <Image src="/student.png" alt="" width={20} height={20} /> },
          { label: "Rotations", href: "/admin/rotations", icon: <RotationsIcon /> },
          { label: "Management", href: "/management", icon: <ManagementIcon /> },
        ]
      : []),
    { label: "My Inventory", href: "/personal-inventory", icon: <PersonalInventoryIcon /> },
    { label: "Profile", href: "/profile", icon: <Image src="/profile.png" alt="" width={20} height={20} /> },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-white/95 dark:bg-darkSurface/95 backdrop-blur-sm border-t border-meadowBorder dark:border-darkBorder pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-meadowOrange" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <span className={active ? "scale-110 transition-transform" : "transition-transform"}>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            moreActive ? "text-meadowOrange" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          <MoreIcon />
          More
        </button>
      </nav>

      <MobileBottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="flex flex-col gap-1 pb-2">
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkBorder transition-colors font-medium"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </MobileBottomSheet>
    </>
  );
}
