import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const codes = await prisma.discountCode.findMany();
    console.log('Total Discount Codes in DB:', codes.length);
    console.log(JSON.stringify(codes, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
