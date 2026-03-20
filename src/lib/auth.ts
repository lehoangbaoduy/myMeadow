import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export type UserRole = "ADMIN" | "TENANT";

export interface CurrentUser {
  clerkId: string;
  role: UserRole;
  tenantId: number | null;
  name: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: { select: { id: true, name: true } } },
  });

  if (!user) return null;

  return {
    clerkId: user.clerkId,
    role: user.role as UserRole,
    tenantId: user.tenant?.id ?? null,
    name: user.tenant?.name ?? null,
  };
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: admin access required");
  }
  return user;
}
