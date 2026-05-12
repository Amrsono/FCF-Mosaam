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
  const login = { username: 'hmostafa', password: 'Fcfhmostafa', outlet: 'eltalg' };

  const hash = await bcrypt.hash(login.password, 10);
  await prisma.admin.upsert({
    where: { username: login.username.toLowerCase() },
    update: {
      passwordHash: hash,
      outlet: login.outlet,
      role: 'staff'
    },
    create: {
      username: login.username.toLowerCase(),
      passwordHash: hash,
      outlet: login.outlet,
      role: 'staff'
    }
  });
  console.log(`✅ Created/Updated user: ${login.username} for branch: ${login.outlet}`);
  console.log('✨ Login created successfully.');
}

main()
  .catch(e => {
    console.error('❌ Error creating login:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
