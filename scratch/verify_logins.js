import 'dotenv/config';
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
  const users = await prisma.admin.findMany({
    where: {
      username: { in: ['mhesham', 'Mhlal'] }
    },
    select: {
      username: true,
      outlet: true,
      role: true
    }
  });

  console.log('--- Database Verification ---');
  if (users.length === 2) {
    console.log('✅ Found both new users:');
    users.forEach(u => console.log(`   - ${u.username} (${u.outlet}) [${u.role}]`));
  } else {
    console.log('❌ Could not find both users. Found:', users.length);
    users.forEach(u => console.log(`   - ${u.username} (${u.outlet})`));
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
