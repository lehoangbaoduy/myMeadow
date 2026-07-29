import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_HOUSE_POLICY, HOUSE_POLICY_SETTING_KEY } from "@/lib/house-policy";
import PolicyClient from "./PolicyClient";

export default async function PolicyPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const setting = await prisma.appSetting.findUnique({ where: { key: HOUSE_POLICY_SETTING_KEY } });

  return <PolicyClient isAdmin={currentUser.role === "ADMIN"} initialPolicy={setting?.value ?? DEFAULT_HOUSE_POLICY} />;
}
