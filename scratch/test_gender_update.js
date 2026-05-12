import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const phone = '201068865703'; // Sample phone from previous check
    console.log('Updating customer:', phone);
    const updated = await prisma.customer.update({
      where: { phone },
      data: { gender: 'Female' }
    });
    console.log('Update result:', updated);
    
    const verified = await prisma.customer.findUnique({ where: { phone } });
    console.log('Verified from DB:', verified.gender);
  } catch (e) {
    console.error('Error during test update:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
