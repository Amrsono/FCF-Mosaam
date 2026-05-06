import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Use TCP `pg` for local/CI seeding — avoids Neon serverless WebSocket Pool issues in Node scripts.
// Vercel API routes keep using `@prisma/adapter-neon` in `api/_lib/prisma.js`.
let connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

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

if (!connectionString) {
  console.error(
    'DATABASE_URL is not set. Add it to .env (local) or your host env (e.g. Vercel), then run again.'
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('FCFAdmin@2024', 10);

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hash,
      role: 'admin'
    }
  });

  const staffHash = await bcrypt.hash('FCFStaff@2024', 10);
  await prisma.admin.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      passwordHash: staffHash,
      role: 'staff'
    }
  });

  console.log('✅ Seed complete. Admin accounts created:');
  console.log('   👤 username: admin   | password: FCFAdmin@2024 | role: admin');
  console.log('   👤 username: staff   | password: FCFStaff@2024 | role: staff');
  console.log('\n⚠️  IMPORTANT: Change these passwords after first login!');

  // Create additional staff profiles
  const users = ['banha1', 'banha2', 'banha3'];
  const banhaPassword = 'fcfuser';
  const banhaHash = await bcrypt.hash(banhaPassword, 10);
  for (const username of users) {
    await prisma.admin.upsert({
      where: { username },
      update: {
        passwordHash: banhaHash,
        role: 'staff'
      },
      create: {
        username,
        passwordHash: banhaHash,
        role: 'staff'
      }
    });
  }
  console.log('✅ Created banha staff profiles (banha1, banha2, banha3).');

  // Add specific branch staff logins
  const specificUsers = [
    { username: 'mhesham', password: 'Fcftegara', outlet: 'tegara' },
    { username: 'mhlal', password: 'Fcfmostashfa', outlet: 'mostashfa' },
    { username: 'mkhafajy', password: 'Fcfkhafajy', outlet: 'eltalg' },
    { username: 'aabdelfattah', password: 'Fcfabdelfattah', outlet: 'tegara' },
    { username: 'hmostafa', password: 'Fcfhmostafa', outlet: 'eltalg' },
    { username: 'bmohamed', password: 'FcfbMohamed', outlet: 'mostashfa' }
  ];

  for (const user of specificUsers) {
    const specificHash = await bcrypt.hash(user.password, 10);
    await prisma.admin.upsert({
      where: { username: user.username.toLowerCase() },
      update: {
        passwordHash: specificHash,
        outlet: user.outlet,
        role: 'staff'
      },
      create: {
        username: user.username.toLowerCase(),
        passwordHash: specificHash,
        outlet: user.outlet,
        role: 'staff'
      }
    });
  }
  console.log('✅ Created specific branch staff profiles (mhesham, mhlal).');
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
