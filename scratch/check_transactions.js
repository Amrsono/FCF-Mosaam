import pkg from 'pg';
const { Pool } = pkg;
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const transactions = await prisma.basataTransaction.findMany({
    orderBy: { performedAt: 'desc' },
    take: 10
  });

  console.log('--- Basata Transactions ---');
  transactions.forEach(t => {
    console.log(`ID: ${t.id}, PerformedAt: ${t.performedAt.toISOString()}, Provider: ${t.serviceProvider}, Amount: ${t.amount}`);
  });

  const orders = await prisma.order.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 10
  });

  console.log('\n--- Bosta Orders ---');
  const bostaOrders = await prisma.bostaOrder.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 10
  });
  bostaOrders.forEach(o => {
    console.log(`ID: ${o.id}, ReceivedAt: ${o.receivedAt.toISOString()}, Status: ${o.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
