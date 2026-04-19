import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // 1. Check if we can reach the database
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - start;

    // 2. Check if the Admin table exists and is seeded
    const adminCount = await prisma.admin.count();

    return res.status(200).json({
      status: 'OK',
      database: 'Connected',
      dbLatencyMs: dbTime,
      adminCount,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
      message: adminCount > 0 ? 'Ready for login' : 'Warning: No admins found in database. Run seeding.'
    });
  } catch (error) {
    console.error('Health Check Failed:', error);
    return res.status(500).json({
      status: 'Error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Check your DATABASE_URL and Ensure your network allows Vercel to connect to Neon.'
    });
  }
}
