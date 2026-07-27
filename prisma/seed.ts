import { prisma } from "../src/lib/prisma";

async function main() {
  // Seed tenants (no Clerk users yet — those are created on first login)
  // We create "shell" tenants that will be linked to real User rows later.
  // For dev purposes we skip the User foreign key and seed Tenant standalone by
  // temporarily allowing nullable userId via a raw approach, BUT since userId
  // is Non-null we need a dev User row per tenant.

  const adminUser = await prisma.user.upsert({
    where: { clerkId: "dev_admin" },
    update: {},
    create: { clerkId: "dev_admin", role: "ADMIN" },
  });

  const baoUser = await prisma.user.upsert({
    where: { clerkId: "dev_bao" },
    update: {},
    create: { clerkId: "dev_bao", role: "TENANT" },
  });

  const cuongUser = await prisma.user.upsert({
    where: { clerkId: "dev_cuong" },
    update: {},
    create: { clerkId: "dev_cuong", role: "TENANT" },
  });

  const khoaUser = await prisma.user.upsert({
    where: { clerkId: "dev_khoa" },
    update: {},
    create: { clerkId: "dev_khoa", role: "TENANT" },
  });

  const duongUser = await prisma.user.upsert({
    where: { clerkId: "dev_duong" },
    update: {},
    create: { clerkId: "dev_duong", role: "TENANT" },
  });

  const nganUser = await prisma.user.upsert({
    where: { clerkId: "dev_ngan" },
    update: {},
    create: { clerkId: "dev_ngan", role: "TENANT" },
  });

  const nhiUser = await prisma.user.upsert({
    where: { clerkId: "dev_nhi" },
    update: {},
    create: { clerkId: "dev_nhi", role: "TENANT" },
  });

  const thaoUser = await prisma.user.upsert({
    where: { clerkId: "dev_thao" },
    update: {},
    create: { clerkId: "dev_thao", role: "TENANT" },
  });

  // Admin tenant profile
  await prisma.tenant.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      name: "Duy Le",
      gender: "MALE",
      roomNumber: "Admin",
      userId: adminUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: baoUser.id },
    update: {},
    create: {
      name: "Bảo",
      gender: "MALE",
      roomNumber: "101",
      userId: baoUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: cuongUser.id },
    update: {},
    create: {
      name: "Cường",
      gender: "MALE",
      roomNumber: "102",
      userId: cuongUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: khoaUser.id },
    update: {},
    create: {
      name: "Khoa",
      gender: "MALE",
      roomNumber: "103",
      userId: khoaUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: duongUser.id },
    update: {},
    create: {
      name: "Dương",
      gender: "MALE",
      roomNumber: "104",
      userId: duongUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: nganUser.id },
    update: {},
    create: {
      name: "Ngân",
      gender: "FEMALE",
      roomNumber: "201",
      userId: nganUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: nhiUser.id },
    update: {},
    create: {
      name: "Nhi",
      gender: "FEMALE",
      roomNumber: "202",
      userId: nhiUser.id,
    },
  });

  await prisma.tenant.upsert({
    where: { userId: thaoUser.id },
    update: {},
    create: {
      name: "Thảo",
      gender: "FEMALE",
      roomNumber: "203",
      userId: thaoUser.id,
    },
  });

  console.log("✅ Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
