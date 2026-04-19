/**
 * Run this script once after `npx prisma db push` to seed the default admin user.
 * Usage: node prisma/seed.js
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
