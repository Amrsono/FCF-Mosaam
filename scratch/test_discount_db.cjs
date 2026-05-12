const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const newDiscount = await prisma.discountCode.create({
      data: {
        code: 'TEST_' + Date.now(),
        type: 'FIXED',
        value: 10,
        minSpend: 0,
        maxUses: null,
        isFirstTimeOnly: false
      }
    });
    console.log('SUCCESS:', newDiscount);
  } catch (error) {
    console.error('ERROR TYPE:', error.constructor.name);
    console.error('ERROR MESSAGE:', error.message);
    if (error.code) console.error('ERROR CODE:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
