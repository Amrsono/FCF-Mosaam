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

const newUsers = [
  { username: 'mhesham', outlet: 'tegara', role: 'staff' },
  { username: 'mhlal', outlet: 'mostashfa', role: 'staff' },
  { username: 'mkhafajy', outlet: 'eltalg', role: 'staff' },
  { username: 'aabdelfattah', outlet: 'tegara', role: 'staff' },
  { username: 'hmostafa', outlet: 'eltalg', role: 'staff' },
  { username: 'bmohamed', outlet: 'mostashfa', role: 'staff' }
];

async function main() {
  console.log('--- Logging Retroactive User Creation ---');
  
  for (const user of newUsers) {
    await prisma.userLog.create({
      data: {
        username: 'System',
        action: 'Create User (Imported)',
        details: JSON.stringify({ targetUser: user.username, role: user.role, outlet: user.outlet }),
        createdAt: new Date() // Today
      }
    });
    console.log(`Logged creation for ${user.username}`);
  }
  
  console.log('Done.');
}

main()
  .catch(e => {
    console.error('Error logging users:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
