import pkg from 'pg';
const { Pool } = pkg;
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Standard PG Driver is more stable for Prisma in local dev and standard Vercel functions
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
