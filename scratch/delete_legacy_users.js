import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  const legacyUsernames = ['banha1', 'banha2', 'banha3', 'staff'];
  
  console.log(`--- Starting Cleanup of Legacy Users: ${legacyUsernames.join(', ')} ---`);
  
  for (const username of legacyUsernames) {
    try {
      const deleted = await prisma.admin.deleteMany({
        where: { username: username.toLowerCase() }
      });
      console.log(`Deleted ${deleted.count} record(s) for username: ${username}`);
    } catch (error) {
      console.error(`Error deleting user ${username}:`, error.message);
    }
  }
  
  console.log('\n--- Final User List ---');
  const remainingUsers = await prisma.admin.findMany();
  remainingUsers.forEach(u => {
    console.log(`Username: ${u.username}, Outlet: ${u.outlet}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
