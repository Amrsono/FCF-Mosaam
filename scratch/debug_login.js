import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (connectionString) {
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}sslmode=verify-full`;
  } else {
    connectionString = connectionString.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  }
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tests = [
    { username: 'mhesham', password: 'Fcftegara' },
    { username: 'Mhlal', password: 'Fcfmostashfa' }
  ];

  for (const test of tests) {
    const admin = await prisma.admin.findUnique({ where: { username: test.username } });
    if (!admin) {
      console.log(`❌ User NOT FOUND: ${test.username}`);
      continue;
    }

    const isValid = await bcrypt.compare(test.password, admin.passwordHash);
    console.log(`Result for ${test.username}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    // Also try lowercase version if it's Mhlal
    if (test.username === 'Mhlal') {
      const adminLower = await prisma.admin.findUnique({ where: { username: 'mhlal' } });
      console.log(`Checking lowercase 'mhlal': ${adminLower ? '✅ Found' : '❌ Not Found'}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
