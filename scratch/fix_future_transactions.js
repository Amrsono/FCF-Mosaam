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
  // Find transactions from today that are in the "future" (likely shifted by 3h)
  const now = new Date();
  
  const transactions = await prisma.basataTransaction.findMany({
    where: {
      performedAt: {
        gt: now // In the future
      }
    }
  });

  console.log(`Found ${transactions.length} future-dated transactions. Fixing...`);

  for (const t of transactions) {
    const originalTime = new Date(t.performedAt);
    // Subtract 3 hours (180 minutes) to correct the shift
    const correctedTime = new Date(originalTime.getTime() - (3 * 60 * 60 * 1000));
    
    await prisma.basataTransaction.update({
      where: { id: t.id },
      data: { performedAt: correctedTime }
    });
    
    console.log(`Fixed ID: ${t.id} - Changed from ${originalTime.toISOString()} to ${correctedTime.toISOString()}`);
  }

  console.log('Done.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
