import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRotationAdminData } from "@/lib/rotation-admin-data";
import RotationAdminClient from "@/components/rotations/RotationAdminClient";

export default async function RotationsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  const data = await getRotationAdminData();

  return <RotationAdminClient initialData={data} />;
}
