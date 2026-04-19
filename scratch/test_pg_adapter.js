import pkg from 'pg';
const { Pool } = pkg;
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

console.log('Testing PG Adapter connection...');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  await prisma.$connect();
  const res = await prisma.$queryRaw`SELECT 1 as result`;
  console.log('PG Adapter Success:', res);
} catch (err) {
  console.error('PG Adapter Error:', err);
} finally {
  await prisma.$disconnect();
}
