import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run development seed against production.");
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "demo.admin@teckfirm.org";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "DemoAdmin123!";

  await prisma.location.updateMany({
    where: { name: { contains: "DEMO", mode: "insensitive" } },
    data: { active: false },
  });
  await prisma.plan.updateMany({
    where: { location: { name: { contains: "DEMO", mode: "insensitive" } } },
    data: { active: false },
  });

  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordHash: adminHash,
      firstName: "Demo",
      lastName: "Admin",
      name: "Demo Admin",
    },
    create: {
      email: adminEmail,
      firstName: "Demo",
      lastName: "Admin",
      name: "Demo Admin",
      role: "SUPER_ADMIN",
      passwordHash: adminHash,
      adminProfile: { create: { title: "Local development super admin" } },
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "platform.name" },
    update: { value: "TeckFirm WiFi" },
    create: { key: "platform.name", value: "TeckFirm WiFi" },
  });

  console.info("Seed complete. Demo locations are hidden. Add locations from /admin.");
  console.info(`Admin: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
