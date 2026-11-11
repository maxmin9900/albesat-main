// Boot-time safety net for production: make sure the super-admin account
// exists, and nothing else.
//
// This deliberately does NOT call prisma/seed.ts. That script wipes every
// artwork, order, bid and auction whenever it cannot find an OMR-priced work,
// which is fine for bootstrapping a demo but would destroy a live catalogue on
// an ordinary restart.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@carpetsamir.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Admin present → ${email}`);
    return;
  }

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Admin created → ${email}`);
}

main()
  .catch((e) => {
    console.error("ensure-admin failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
