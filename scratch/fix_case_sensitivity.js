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
  // Find Mhlal and rename to mhlal
  const mhlal = await prisma.admin.findUnique({ where: { username: 'Mhlal' } });
  if (mhlal) {
    // Delete the old one and create new one to avoid ID conflicts if we just update username (which is unique)
    // Actually, update is fine since mhlal lowercase doesn't exist yet (checked in previous script)
    await prisma.admin.update({
      where: { username: 'Mhlal' },
      data: { username: 'mhlal' }
    });
    console.log('✅ Renamed Mhlal to mhlal');
  } else {
    console.log('ℹ️ Mhlal not found, might already be fixed.');
  }

  // Ensure all users are lowercase
  const allAdmins = await prisma.admin.findMany();
  for (const admin of allAdmins) {
    if (admin.username !== admin.username.toLowerCase()) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { username: admin.username.toLowerCase() }
      });
      console.log(`✅ Normalized ${admin.username} to ${admin.username.toLowerCase()}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
