import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const d = await prisma.discountCode.findMany();
    console.log('GET SUCCESS:', d.length, 'codes found');
    
    const newDiscount = await prisma.discountCode.create({
      data: {
        code: 'TEST_' + Math.floor(Math.random() * 100000),
        type: 'FIXED',
        value: 10,
        minSpend: 0,
        maxUses: null,
        isFirstTimeOnly: false
      }
    });
    console.log('POST SUCCESS:', newDiscount);
  } catch (error) {
    console.error('ERROR TYPE:', error.constructor.name);
    console.error('ERROR MESSAGE:', error.message);
    if (error.code) console.error('ERROR CODE:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
