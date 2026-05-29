import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Use TCP `pg` for local/CI seeding — avoids Neon serverless WebSocket Pool issues in Node scripts.
// Vercel API routes keep using `@prisma/adapter-neon` in `api/_lib/prisma.js`.
let connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

// To silence the pg warning about SSL aliases, ensure sslmode=verify-full is present
if (connectionString) {
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}sslmode=verify-full`;
  } else {
    // Replace weaker SSL modes with verify-full to maintain current behavior and silence warnings
    connectionString = connectionString.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  }
}

if (!connectionString) {
  console.error(
    'DATABASE_URL is not set. Add it to .env (local) or your host env (e.g. Vercel), then run again.'
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────
// Imtidad Outlet seed data
// Positions are calibrated for the SVG viewBox (450x480) Egypt map.
// The 3 FCF stations are spread apart so they don't visually overlap.
// ─────────────────────────────────────────────────────────────
const OUTLETS = [
  // Active FCF pickup stations
  { key: 'eltalg',    nameEn: 'Banha - Eltalg Station',    nameAr: 'بنها - محطة التلج',     city: 'Banha',      x: 245, y: 126, baseLoad: 92, status: 'Active'   },
  { key: 'tegara',    nameEn: 'Banha - Tegara Station',    nameAr: 'بنها - محطة التجارة',   city: 'Banha',      x: 231, y: 140, baseLoad: 45, status: 'Active'   },
  { key: 'mostashfa', nameEn: 'Banha - Mostashfa Station', nameAr: 'بنها - محطة المستشفى', city: 'Banha',      x: 258, y: 142, baseLoad: 30, status: 'Active'   },
  // Regional routing hubs (inactive by default — admin can activate when ready)
  { key: 'cairo_hub', nameEn: 'Cairo Hub',                 nameAr: 'مركز القاهرة الرئيسي', city: 'Cairo',      x: 242, y: 155, baseLoad: 88, status: 'Inactive' },
  { key: 'giza_hub',  nameEn: 'Giza Station',              nameAr: 'محطة الجيزة',           city: 'Giza',       x: 215, y: 162, baseLoad: 65, status: 'Inactive' },
  { key: 'alex_hub',  nameEn: 'Alexandria Hub',            nameAr: 'منفذ الإسكندرية',       city: 'Alexandria', x: 120, y:  88, baseLoad: 75, status: 'Inactive' },
  { key: 'tanta_hub', nameEn: 'Tanta Hub',                 nameAr: 'منفذ طنطا',             city: 'Tanta',      x: 200, y: 110, baseLoad: 50, status: 'Inactive' },
];

async function main() {
  const hash = await bcrypt.hash('FCFAdmin@2024', 10);

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hash,
      role: 'admin'
    }
  });

  console.log('✅ Seed complete. Admin accounts created:');
  console.log('   👤 username: admin   | password: FCFAdmin@2024 | role: admin');
  console.log('\n⚠️  IMPORTANT: Change these passwords after first login!');


  // Add specific branch staff logins
  const specificUsers = [
    { username: 'mhesham', password: 'Fcftegara', outlet: 'tegara' },
    { username: 'mhlal', password: 'Fcfmostashfa', outlet: 'mostashfa' },
    { username: 'mkhafajy', password: 'Fcfkhafajy', outlet: 'eltalg' },
    { username: 'aabdelfattah', password: 'Fcfabdelfattah', outlet: 'tegara' },
    { username: 'hmostafa', password: 'Fcfhmostafa', outlet: 'eltalg' },
    { username: 'bmohamed', password: 'FcfbMohamed', outlet: 'mostashfa' }
  ];

  for (const user of specificUsers) {
    const specificHash = await bcrypt.hash(user.password, 10);
    await prisma.admin.upsert({
      where: { username: user.username.toLowerCase() },
      update: {
        passwordHash: specificHash,
        outlet: user.outlet,
        role: 'staff'
      },
      create: {
        username: user.username.toLowerCase(),
        passwordHash: specificHash,
        outlet: user.outlet,
        role: 'staff'
      }
    });
  }
  console.log('✅ Created specific branch staff profiles (mhesham, mhlal).');

  // ─── Seed Imtidad Outlets ───────────────────────────────────────────────────
  console.log('\n🗺️  Seeding Imtidad logistics outlets...');
  for (const outlet of OUTLETS) {
    await prisma.imtidadOutlet.upsert({
      where: { key: outlet.key },
      update: {
        nameEn:   outlet.nameEn,
        nameAr:   outlet.nameAr,
        city:     outlet.city,
        x:        outlet.x,
        y:        outlet.y,
        baseLoad: outlet.baseLoad,
        // Do NOT overwrite status — preserve any admin changes made after initial seeding
      },
      create: outlet,
    });
    console.log(`   📍 ${outlet.status === 'Active' ? '🟢' : '⚫'} ${outlet.key}: ${outlet.nameEn}`);
  }
  console.log('✅ Imtidad outlets seeded (3 active FCF stations + 4 inactive regional hubs).');
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

