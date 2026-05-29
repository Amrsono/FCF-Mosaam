/**
 * seed_outlets.js
 * Run with: node seed_outlets.js
 * Seeds/updates the ImtidadOutlet table with all current pickup stations.
 * Safe to re-run — uses upsert (status field is preserved for existing records).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// TCP pg adapter — avoids Neon serverless WebSocket issues in plain Node scripts
let connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (connectionString) {
  if (!connectionString.includes('sslmode=')) {
    const sep = connectionString.includes('?') ? '&' : '?';
    connectionString += `${sep}sslmode=verify-full`;
  } else {
    connectionString = connectionString.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  }
}

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set. Add it to .env and try again.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────
// Canonical outlet data
// Positions calibrated for the SVG viewBox (450×480) Egypt map.
// The 3 FCF Banha stations are spread so they don't visually overlap.
// ─────────────────────────────────────────────────────────────
const OUTLETS = [
  // Active FCF pickup stations (status: Active)
  { key: 'eltalg',    nameEn: 'Banha - Eltalg Station',    nameAr: 'بنها - محطة التلج',     city: 'Banha',      x: 245, y: 126, baseLoad: 92, status: 'Active'   },
  { key: 'tegara',    nameEn: 'Banha - Tegara Station',    nameAr: 'بنها - محطة التجارة',   city: 'Banha',      x: 231, y: 140, baseLoad: 45, status: 'Active'   },
  { key: 'mostashfa', nameEn: 'Banha - Mostashfa Station', nameAr: 'بنها - محطة المستشفى', city: 'Banha',      x: 258, y: 142, baseLoad: 30, status: 'Active'   },
  // Regional routing hubs (Inactive by default — activate via the admin UI)
  { key: 'cairo_hub', nameEn: 'Cairo Hub',                 nameAr: 'مركز القاهرة الرئيسي', city: 'Cairo',      x: 242, y: 155, baseLoad: 88, status: 'Inactive' },
  { key: 'giza_hub',  nameEn: 'Giza Station',              nameAr: 'محطة الجيزة',           city: 'Giza',       x: 215, y: 162, baseLoad: 65, status: 'Inactive' },
  { key: 'alex_hub',  nameEn: 'Alexandria Hub',            nameAr: 'منفذ الإسكندرية',       city: 'Alexandria', x: 120, y:  88, baseLoad: 75, status: 'Inactive' },
  { key: 'tanta_hub', nameEn: 'Tanta Hub',                 nameAr: 'منفذ طنطا',             city: 'Tanta',      x: 200, y: 110, baseLoad: 50, status: 'Inactive' },
];

async function main() {
  console.log('🗺️  Seeding/updating Imtidad outlets...\n');

  for (const outlet of OUTLETS) {
    const existing = await prisma.imtidadOutlet.findUnique({ where: { key: outlet.key } });

    if (existing) {
      await prisma.imtidadOutlet.update({
        where: { key: outlet.key },
        data: {
          nameEn:   outlet.nameEn,
          nameAr:   outlet.nameAr,
          city:     outlet.city,
          x:        outlet.x,
          y:        outlet.y,
          baseLoad: outlet.baseLoad,
          // status is intentionally preserved — do not overwrite admin changes
        }
      });
      console.log(`  ✏️  Updated : ${outlet.key} → ${outlet.nameEn} (status preserved: ${existing.status})`);
    } else {
      await prisma.imtidadOutlet.create({ data: outlet });
      console.log(`  ✅ Created : ${outlet.key} → ${outlet.nameEn} [${outlet.status}]`);
    }
  }

  const all = await prisma.imtidadOutlet.findMany({ orderBy: { nameEn: 'asc' } });
  console.log(`\n📊 Total outlets in DB: ${all.length}`);
  all.forEach(o => console.log(`   ${o.status === 'Active' ? '🟢' : '⚫'} ${o.key.padEnd(12)} | (${o.x},${o.y}) | ${o.status.padEnd(8)} | ${o.nameEn}`));
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

