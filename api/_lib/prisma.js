import pkg from 'pg';
const { Pool } = pkg;
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Standard PG Driver is more stable for Prisma in local dev and standard Vercel functions
let connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

// To silence the pg warning about SSL aliases, ensure sslmode=verify-full is present
if (connectionString) {
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}sslmode=verify-full`;
  } else {
    // Replace weaker SSL modes with verify-full to maintain current behavior and silence warnings
    connectionString = connectionString.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  }
}

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
