import { prisma } from '../api/_lib/prisma.js';

async function main() {
  const counts = await prisma.order.groupBy({
    by: ['outlet'],
    _count: {
      id: true
    },
    where: { isDeleted: false }
  });
  console.log('Order counts by outlet (raw):');
  console.table(counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
