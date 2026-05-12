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
  const logs = await prisma.userLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log('--- Last 20 Logs ---');
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] User: ${l.username}, Action: ${l.action}, Details: ${l.details}`);
  });
}

main()
  .catch(e => {
    console.error('Error checking logs:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
