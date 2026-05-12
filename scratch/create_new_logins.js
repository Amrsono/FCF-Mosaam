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
  const newLogins = [
    { username: 'mhesham', password: 'Fcftegara', outlet: 'tegara' },
    { username: 'Mhlal', password: 'Fcfmostashfa', outlet: 'mostashfa' }
  ];

  for (const login of newLogins) {
    const hash = await bcrypt.hash(login.password, 10);
    await prisma.admin.upsert({
      where: { username: login.username },
      update: {
        passwordHash: hash,
        outlet: login.outlet,
        role: 'staff'
      },
      create: {
        username: login.username,
        passwordHash: hash,
        outlet: login.outlet,
        role: 'staff'
      }
    });
    console.log(`✅ Created/Updated user: ${login.username} for branch: ${login.outlet}`);
  }

  console.log('✨ All new logins created successfully.');
}

main()
  .catch(e => {
    console.error('❌ Error creating logins:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
