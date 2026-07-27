import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMaintenanceRequests } from "@/lib/maintenance-admin-data";
import MaintenanceAdminClient from "@/components/maintenance/MaintenanceAdminClient";

export default async function MaintenanceAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  const requests = await getMaintenanceRequests();
  return <MaintenanceAdminClient initialRequests={requests} />;
}
