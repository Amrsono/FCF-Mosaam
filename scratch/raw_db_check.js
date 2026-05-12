import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    console.log('Tables:', tables.map(t => t.table_name));
    
    const count = await prisma.$queryRaw`SELECT count(*) FROM "DiscountCode"`;
    console.log('DiscountCode count:', count);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
