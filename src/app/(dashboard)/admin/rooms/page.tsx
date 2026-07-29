import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRoomsAdminData } from "@/lib/rooms-admin-data";
import RoomsAdminClient from "@/components/rooms/RoomsAdminClient";

export default async function RoomsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  const data = await getRoomsAdminData();

  return <RoomsAdminClient rooms={data.rooms} tenants={data.tenants} />;
}
