import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Use TCP `pg` for local/CI seeding — avoids Neon serverless WebSocket Pool issues in Node scripts.
// Vercel API routes keep using `@prisma/adapter-neon` in `api/_lib/prisma.js`.
const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

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
