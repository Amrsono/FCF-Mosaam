import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const logs = await prisma.userLog.findMany({
      where: { action: 'Add Discount Code' },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Creation Logs:', JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
