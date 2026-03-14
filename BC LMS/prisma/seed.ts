// prisma/seed.ts — Seeds admin, manager, teacher users and 3 programs
// Run: npx prisma db seed

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  const hashedPassword = await bcrypt.hash("changeme123", 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@buttercuplearning.com" },
    update: {},
    create: {
      email: "admin@buttercuplearning.com",
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
    },
  });
  console.log(`Admin: ${admin.email}`);

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: "manager@buttercuplearning.com" },
    update: {},
    create: {
      email: "manager@buttercuplearning.com",
      password: hashedPassword,
      name: "Quản Lý",
      role: "MANAGER",
      school: "Buttercup HN",
    },
  });
  console.log(`Manager: ${manager.email}`);

  // Teacher
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@buttercuplearning.com" },
    update: {},
    create: {
      email: "teacher@buttercuplearning.com",
      password: hashedPassword,
      name: "Giáo Viên",
      role: "TEACHER",
      school: "Buttercup HN",
    },
  });
  console.log(`Teacher: ${teacher.email}`);

  // Create 3 programs
  const programs = [
    {
      name: "Buttercup",
      slug: "buttercup",
      description: "Buttercup English training program",
    },
    {
      name: "Primary Success",
      slug: "primary-success",
      description: "Primary Success teacher training program",
    },
    {
      name: "Primary Secondary",
      slug: "primary-secondary",
      description: "Primary Secondary teacher training program",
    },
  ];

  for (const program of programs) {
    const created = await prisma.program.upsert({
      where: { slug: program.slug },
      update: { name: program.name, description: program.description },
      create: program,
    });
    console.log(`Program: ${created.name} (${created.slug})`);
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
