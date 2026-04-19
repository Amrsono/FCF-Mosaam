import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon serverless to work in Node.js environments
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaNeon(connectionString)
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
