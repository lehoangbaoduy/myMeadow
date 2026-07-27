import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Don't allow re-registration
  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing?.registrationComplete) {
    return NextResponse.json({ error: "Already registered" }, { status: 400 });
  }

  const body = await req.json();
  const { name, gender, dob, email, phone } = body;

  if (!name || !gender || !email) {
    return NextResponse.json({ error: "name, gender, and email are required" }, { status: 400 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const role = adminEmails.includes(email.toLowerCase()) ? "ADMIN" : "TENANT";

  if (existing) {
    // Update existing incomplete record
    await prisma.user.update({
      where: { clerkId: userId },
      data: { role, registrationComplete: true },
    });
    await prisma.tenant.update({
      where: { userId: existing.id },
      data: {
        name,
        gender,
        phone: phone || null,
        dob: dob ? new Date(dob) : null,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        clerkId: userId,
        role,
        registrationComplete: true,
        tenant: {
          create: {
            name,
            gender,
            phone: phone || null,
            dob: dob ? new Date(dob) : null,
          },
        },
      },
    });
  }

  if (role !== "ADMIN") {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          fromName: "System",
          content: `🆕 ${name} (${email}) just registered. Assign them to a room in Residents if they belong to a reserved placeholder.`,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
