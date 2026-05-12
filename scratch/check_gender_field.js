import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const customers = await prisma.customer.findMany({ take: 1 });
    console.log('Sample Customer:', customers[0]);
    console.log('Schema Keys:', customers[0] ? Object.keys(customers[0]) : 'No customers found');
  } catch (e) {
    console.error('Error checking schema:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
