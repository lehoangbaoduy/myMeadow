import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewMode } from "@/lib/view-mode";

export default async function Homepage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  // First login or registration not complete — send to registration page
  if (!user || !user.registrationComplete) {
    redirect("/register");
  }

  const target = user.role === "ADMIN" ? "/admin" : "/residents";

  // First time this device is seen — ask PC vs Mobile before entering the dashboard.
  const viewMode = await getViewMode();
  if (!viewMode) redirect(`/choose-view?next=${target}`);

  redirect(target);
}
