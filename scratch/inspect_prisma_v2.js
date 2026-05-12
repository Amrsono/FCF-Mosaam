import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    console.log('discountCode type:', typeof prisma.discountCode);
    console.log('discountCode keys:', Object.keys(prisma.discountCode || {}));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
