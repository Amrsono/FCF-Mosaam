import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (connectionString) {
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}sslmode=verify-full`;
  } else {
    connectionString = connectionString.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  }
}

if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const mapping = {
    'وبور الثلج': 'Banha 1',
    'تجاره': 'Banha 2',
    'المستشفى': 'Banha 3',
    'وبور التلج': 'Banha 1', // Variations
    'تجارة': 'Banha 2',
    'المستشفي': 'Banha 3'
  };

  for (const [oldName, newName] of Object.entries(mapping)) {
    console.log(`Migrating ${oldName} -> ${newName}...`);

    // Order
    const orders = await prisma.order.updateMany({
      where: { outlet: oldName },
      data: { outlet: newName }
    });
    console.log(`  Updated ${orders.count} Orders`);

    // BostaOrder
    const bostaOrders = await prisma.bostaOrder.updateMany({
      where: { outlet: oldName },
      data: { outlet: newName }
    });
    console.log(`  Updated ${bostaOrders.count} BostaOrders`);

    // CustomerReturn
    const customerReturns = await prisma.customerReturn.updateMany({
      where: { outlet: oldName },
      data: { outlet: newName }
    });
    console.log(`  Updated ${customerReturns.count} CustomerReturns`);
  }

  console.log('✅ Migration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
