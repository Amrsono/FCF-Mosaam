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

async function testLoginLogging() {
  const username = 'mhesham';
  console.log(`Testing login logging for ${username}...`);
  
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    console.error('User not found');
    return;
  }

  // Simulate the logic in api/auth/login.js
  await prisma.userLog.create({
    data: {
      username: admin.username,
      action: 'User Login (Test)',
      details: JSON.stringify({ outlet: admin.outlet, role: admin.role })
    }
  });

  console.log('Log entry created successfully.');
  
  const lastLog = await prisma.userLog.findFirst({
    where: { username, action: 'User Login (Test)' },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('Verified log in DB:', lastLog);
}

testLoginLogging()
  .catch(e => {
    console.error('Test failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
