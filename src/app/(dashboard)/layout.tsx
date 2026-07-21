import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";
import "../globals.css";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import MobileShell from "@/components/mobile/MobileShell";
import { getViewMode } from "@/lib/view-mode";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyMeadow Dashboard",
  description: "MyMeadow Rental Management System",
  icons: { icon: "/logo.png" },
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewMode = await getViewMode();

  // Mobile mode gets its own shell entirely. Anything else (including a deep link that
  // skipped the chooser) falls back to the existing desktop shell, unchanged.
  if (viewMode === "mobile") {
    return <MobileShell>{children}</MobileShell>;
  }

  return (
    <div className="h-screen flex bg-meadowLight dark:bg-darkBg overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 flex flex-col bg-white dark:bg-darkSurface border-r border-meadowBorder dark:border-darkBorder shadow-[1px_0_0_0_rgba(0,0,0,0.04)]">
        <Link href="/" className="flex items-center justify-center lg:justify-start gap-2 mb-2">
          <Image src="/logo.png" alt="logo" width={70} height={70} className="drop-shadow-sm" />
          <span className="hidden lg:block font-extrabold text-gray-900 dark:text-white tracking-tight">MyMeadow</span>
        </Link>
        <Menu />
      </div>
      {/* RIGHT MAIN */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] overflow-y-auto overflow-x-hidden flex flex-col">
        <Navbar />
        <div className="flex-1 bg-meadowLight dark:bg-darkBg">
          {children}
        </div>
        <footer className="text-center text-xs text-gray-400 dark:text-gray-500 py-3 border-t border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface">
          © {new Date().getFullYear()} MyMeadow · All rights reserved
        </footer>
      </div>
    </div>
  );
}
