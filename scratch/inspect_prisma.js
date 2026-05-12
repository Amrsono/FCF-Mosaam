import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_')));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
