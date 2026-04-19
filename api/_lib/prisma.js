import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Stability flags for Neon in Serverless
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false; // Prevents some 'terminated unexpectedly' errors

const connectionString = process.env.DATABASE_URL;

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10 // Limit connections in serverless to avoid exhaustion
  });
  const adapter = new PrismaNeon(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
