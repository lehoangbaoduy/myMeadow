import { getCurrentUser } from "@/lib/auth";
import { getViewMode } from "@/lib/view-mode";
import { redirect } from "next/navigation";
import ManagementClient from "./ManagementClient";
import MobileManagementClient from "@/components/mobile/MobileManagementClient";

export default async function ManagementPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  const isMobile = (await getViewMode()) === "mobile";
  return isMobile ? <MobileManagementClient /> : <ManagementClient />;
}
