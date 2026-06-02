import pkg from 'pg';
const { Pool } = pkg;
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

let connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (connectionString) {
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}sslmode=verify-full`;
  } else {
    connectionString = connectionString.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  }
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("Checking Tegara Outlet Orders in DB...");
  
  // Get Jumia picked up orders
  const jumiaOrders = await prisma.order.findMany({
    where: {
      status: 'Picked Up',
      outlet: {
        contains: 'tegara'
      }
    }
  });

  // Get Bosta picked up orders
  const bostaOrders = await prisma.bostaOrder.findMany({
    where: {
      status: 'Picked Up',
      outlet: {
        contains: 'tegara'
      }
    }
  });

  console.log(`Jumia picked up orders count in Tegara: ${jumiaOrders.length}`);
  console.log(`Bosta picked up orders count in Tegara: ${bostaOrders.length}`);

  const categories = {};
  const products = {};

  const processOrder = (o) => {
    const cat = o.category || 'None';
    categories[cat] = (categories[cat] || 0) + 1;

    const desc = o.description || 'None';
    products[desc] = (products[desc] || 0) + 1;
  };

  jumiaOrders.forEach(o => processOrder(o));
  bostaOrders.forEach(o => processOrder(o));

  console.log("\n--- Categories and their counts in Tegara: ---");
  console.log(JSON.stringify(categories, null, 2));

  console.log("\n--- Top Electronics/Phone Products in Tegara: ---");
  const electronicsProducts = {};
  [...jumiaOrders, ...bostaOrders].forEach(o => {
    const catLower = String(o.category || '').toLowerCase();
    if (catLower.includes('electron') || catLower.includes('phone') || catLower.includes('سماعة')) {
      const desc = o.description || 'None';
      electronicsProducts[desc] = (electronicsProducts[desc] || 0) + 1;
    }
  });
  console.log(JSON.stringify(electronicsProducts, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

check();
