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

export interface HeaderUserInfo {
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  initial: string;
}

/** Shared by the desktop Navbar and the mobile header — avatar lookup + display name in one place. */
export async function getHeaderUserInfo(): Promise<HeaderUserInfo> {
  const currentUser = await getCurrentUser();

  let avatarUrl: string | null = null;
  if (currentUser?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      select: { avatarData: true },
    });
    if (tenant?.avatarData) {
      avatarUrl = `/api/tenants/${currentUser.tenantId}/avatar`;
    }
  }

  const name = currentUser?.name ?? "Guest";

  return {
    name,
    role: currentUser?.role ?? "TENANT",
    avatarUrl,
    initial: name.charAt(0).toUpperCase(),
  };
}
