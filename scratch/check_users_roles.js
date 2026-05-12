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
  const users = await prisma.admin.findMany();
  console.log('--- Current Users in Database ---');
  users.forEach(u => {
    console.log(`User: ${u.username}, Role: ${u.role}, Outlet: ${u.outlet}`);
  });
}

main()
  .catch(e => {
    console.error('Error checking users:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
