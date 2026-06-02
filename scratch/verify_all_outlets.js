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
  const start = new Date('2026-05-01T00:00:00.000Z');
  const end = new Date('2026-05-31T23:59:59.999Z');

  // Fetch all orders picked up in May
  const orders = await prisma.order.findMany({
    where: {
      isDeleted: false,
      status: 'Picked Up',
      pickedUpAt: { gte: start, lte: end }
    }
  });

  // Fetch all UserLogs under 'Mark Order Picked Up'
  const logs = await prisma.userLog.findMany({
    where: {
      action: 'Mark Order Picked Up'
    }
  });

  const orderLogsMap = {};
  logs.forEach(l => {
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

  const stats = {
    eltalg: { orders: 0, logs: 0, unmatched: 0 },
    tegara: { orders: 0, logs: 0, unmatched: 0 },
    mostashfa: { orders: 0, logs: 0, unmatched: 0 }
  };

  orders.forEach(o => {
    const outlet = normalizeOutlet(o.outlet);
    if (stats[outlet]) {
      stats[outlet].orders++;
      if (orderLogsMap[o.id]) {
        stats[outlet].logs++;
      } else {
        stats[outlet].unmatched++;
      }
    }
  });

  console.log("Final verification statistics for May 2026:");
  console.log(stats);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
