import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  const logs = await prisma.userLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log('--- Recent User Logs ---');
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] User: ${l.username}, Action: ${l.action}, Details: ${l.details}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
