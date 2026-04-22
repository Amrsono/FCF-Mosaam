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

if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = ['banha1', 'banha2', 'banha3'];
  const password = 'fcfuser';
  const role = 'staff';

  const hash = await bcrypt.hash(password, 10);

  for (const username of users) {
    await prisma.admin.upsert({
      where: { username },
      update: {
        passwordHash: hash,
        role
      },
      create: {
        username,
        passwordHash: hash,
        role
      }
    });
    console.log(`Created/Updated user: ${username}`);
  }

  console.log('✅ All users created successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
