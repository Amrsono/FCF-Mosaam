import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  const users = await prisma.admin.findMany();
  console.log('--- Current Admin Users ---');
  users.forEach(u => {
    console.log(`Username: ${u.username}, Role: ${u.role}, Outlet: ${u.outlet}`);
  });
  
  const uniqueOutlets = [...new Set(users.map(u => u.outlet))];
  console.log('\n--- Unique Outlets in Admin Table ---');
  console.log(uniqueOutlets);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
