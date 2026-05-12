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
    const jumiaOrders = await prisma.order.findMany({
      where: { customerPhone: '+201145767355' }
    });
    const bostaOrders = await prisma.bostaOrder.findMany({
      where: { customerPhone: '+201145767355' }
    });
    console.log("Jumia Orders:", JSON.stringify(jumiaOrders, null, 2));
    console.log("Bosta Orders:", JSON.stringify(bostaOrders, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
