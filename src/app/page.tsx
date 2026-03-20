import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Homepage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  // First login or registration not complete — send to registration page
  if (!user || !user.registrationComplete) {
    redirect("/register");
  }

  if (user.role === "ADMIN") redirect("/admin");
  redirect("/residents");
}
