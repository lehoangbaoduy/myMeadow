import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.tenant.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✅ All User and Tenant rows deleted.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
