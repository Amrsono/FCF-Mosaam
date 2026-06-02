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

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const normalizeOutlet = (val) => {
  if (!val) return 'eltalg';
  const v = String(val).toLowerCase().trim();
  if (v === 'eltalg' || v.includes('banha 1') || v.includes('banha1') || v.includes('ثلج') || v.includes('تلج')) return 'eltalg';
  if (v === 'tegara' || v.includes('banha 2') || v.includes('banha2') || v.includes('تجارة') || v.includes('تجاره')) return 'tegara';
  if (v === 'mostashfa' || v.includes('banha 3') || v.includes('banha3') || v.includes('مستشفى') || v.includes('مستشفي')) return 'mostashfa';
  return val;
};

async function main() {
  const isCommit = process.argv.includes('--commit');
  console.log(`Starting Log Correction and Backfill for All Outlets. Mode: ${isCommit ? 'COMMIT' : 'DRY-RUN'}`);

  const start = new Date('2026-05-01T00:00:00.000Z');
  const end = new Date('2026-05-31T23:59:59.999Z');

  // 1. Rename 'Pick Up Order' to 'Mark Order Picked Up' for any remaining legacy logs
  const legacyLogs = await prisma.userLog.findMany({
    where: { action: 'Pick Up Order' }
  });
  console.log(`Found ${legacyLogs.length} logs with legacy action "Pick Up Order".`);

  if (isCommit && legacyLogs.length > 0) {
    const updateRes = await prisma.userLog.updateMany({
      where: { action: 'Pick Up Order' },
      data: { action: 'Mark Order Picked Up' }
    });
    console.log(`Updated ${updateRes.count} legacy logs in database.`);
  }

  // 2. Identify missing logs across all outlets
  const orders = await prisma.order.findMany({
    where: {
      isDeleted: false,
      status: 'Picked Up',
      pickedUpAt: { gte: start, lte: end }
    }
  });

  const logs = await prisma.userLog.findMany({
    where: {
      createdAt: { gte: start, lte: end }
    }
  });

  const allLogsWithPickup = await prisma.userLog.findMany({
    where: {
      action: 'Mark Order Picked Up'
    }
  });

  const orderLogsMap = {};
  allLogsWithPickup.forEach(l => {
    try {
      if (l.details) {
        const details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
        if (details) {
          const id = details.id || details.orderId || details.transactionId;
          if (id) {
            orderLogsMap[id] = l;
          }
        }
      }
    } catch (e) {}
  });

  const unmatchedOrders = orders.filter(o => !orderLogsMap[o.id]);
  console.log(`Found ${unmatchedOrders.length} total orders picked up in May without a user log.`);

  // Build daily active user map per normalized outlet: outlet -> day -> username -> count
  const dailyActiveUsers = {
    eltalg: {},
    tegara: {},
    mostashfa: {}
  };

  logs.forEach(l => {
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    const outlet = normalizeOutlet(l.outlet);
    
    if (dailyActiveUsers[outlet]) {
      if (!dailyActiveUsers[outlet][day]) {
        dailyActiveUsers[outlet][day] = {};
      }
      dailyActiveUsers[outlet][day][l.username] = (dailyActiveUsers[outlet][day][l.username] || 0) + 1;
    }
  });

  // Default fallback users for outlets
  const outletDefaults = {
    eltalg: 'mhesham',
    tegara: 'mhlal',
    mostashfa: 'aabdelfattah'
  };

  let backfillCount = 0;
  const breakDownStats = { eltalg: 0, tegara: 0, mostashfa: 0 };

  for (const o of unmatchedOrders) {
    const day = new Date(o.pickedUpAt).toISOString().slice(0, 10);
    const outlet = normalizeOutlet(o.outlet);
    
    const candidates = (dailyActiveUsers[outlet] && dailyActiveUsers[outlet][day]) || {};
    
    let resolvedUser = null;
    let maxLogs = 0;
    Object.entries(candidates).forEach(([user, count]) => {
      if (count > maxLogs) {
        maxLogs = count;
        resolvedUser = user;
      }
    });

    if (!resolvedUser) {
      resolvedUser = outletDefaults[outlet] || 'mhesham';
    }

    breakDownStats[outlet]++;

    console.log(`[Backfill Plan] Order: ${o.id} (${outlet}) -> User: ${resolvedUser}, Time: ${o.pickedUpAt.toISOString()}`);

    if (isCommit) {
      await prisma.userLog.create({
        data: {
          username: resolvedUser,
          action: 'Mark Order Picked Up',
          details: JSON.stringify({ id: o.id, amount: Number(o.totalValue) || 0 }),
          outlet: outlet,
          createdAt: o.pickedUpAt
        }
      });
      backfillCount++;
    }
  }

  console.log(`\nUnmatched Breakdown:`, breakDownStats);

  if (isCommit) {
    console.log(`Successfully backfilled ${backfillCount} logs in database.`);
  } else {
    console.log(`Dry-run finished. Run with '--commit' to apply these changes to the database.`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
