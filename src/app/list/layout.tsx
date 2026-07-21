import Link from "next/link";
import Image from "next/image";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import MobileShell from "@/components/mobile/MobileShell";
import { getViewMode } from "@/lib/view-mode";

export default async function ListLayout({ children }: { children: React.ReactNode }) {
  const viewMode = await getViewMode();

  if (viewMode === "mobile") {
    return <MobileShell>{children}</MobileShell>;
  }

  return (
    <div className="h-screen flex bg-meadowLight dark:bg-darkBg">
      {/* LEFT SIDEBAR */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 bg-white dark:bg-darkSurface border-r border-meadowBorder dark:border-darkBorder">
        <Link href="/" className="flex items-center justify-center lg:justify-start gap-2">
          <Image src="/logo.png" alt="logo" width={70} height={70} />
          <span className="hidden lg:block font-bold text-gray-800 dark:text-gray-100">MyMeadow</span>
        </Link>
        <Menu />
      </div>
      {/* RIGHT MAIN */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] overflow-scroll flex flex-col">
        <Navbar />
        <div className="flex-1 bg-meadowLight dark:bg-darkBg">
          {children}
        </div>
        <footer className="text-center text-xs text-gray-400 dark:text-gray-600 py-3 border-t border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface">
          © {new Date().getFullYear()} Copyright by Duy Le
        </footer>
      </div>
    </div>
  );
}
