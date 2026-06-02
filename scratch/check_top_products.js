import pkg from 'pg';
const { Pool } = pkg;
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

async function check() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const orders = await prisma.order.findMany({
      where: { status: 'Picked Up' }
    });
    
    const productMap = orders.reduce((acc, o) => {
      const name = (o.description || 'Unknown').trim();
      if (!acc[name]) acc[name] = { count: 0, value: 0 };
      acc[name].count += 1;
      acc[name].value += (Number(o.totalValue) || 0);
      return acc;
    }, {});
    
    const topProductsData = Object.entries(productMap)
      .map(([name, stats]) => ({ name, count: stats.count, value: stats.value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    console.log("Top Products:", JSON.stringify(topProductsData, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
