import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ManagementClient from "./ManagementClient";

export default async function ManagementPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (currentUser.role !== "ADMIN") redirect("/admin");

  return <ManagementClient />;
}
