import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AdminUser {
  id: number;
  clerkId: string;
}

/** Shared 401/403 gate for the rotation admin API (roster/teams/shift/occurrences) — all four routes are admin-only. */
export async function requireAdminUser(): Promise<{ user: AdminUser } | { error: NextResponse }> {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { user: { id: user.id, clerkId: user.clerkId } };
}
