import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isPlaceholderClerkId } from "@/lib/tenant-placeholder";

/**
 * Minimal {id, name} list of other active, non-placeholder residents — used
 * to populate the personal-inventory share picker. Deliberately narrower
 * than GET /api/tenants (which returns dob/roomNumber/notes/rentAmount to
 * any authenticated user); this route only needs a name to share with.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: { select: { id: true } } },
  });
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    include: { user: { select: { clerkId: true } } },
    orderBy: { name: "asc" },
  });

  const roommates = tenants
    .filter((t) => !isPlaceholderClerkId(t.user.clerkId) && t.id !== caller.tenant?.id)
    .map((t) => ({ id: t.id, name: t.name }));

  return NextResponse.json(roommates);
}
