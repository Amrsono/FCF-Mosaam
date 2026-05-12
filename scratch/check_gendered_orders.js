import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const genders = ['Male', 'Female'];
    const customers = await prisma.customer.findMany({
      where: { gender: { in: genders } },
      select: { phone: true, name: true, gender: true }
    });
    
    console.log(`Found ${customers.length} customers with gender set.`);
    
    const normalizePhone = (phone) => {
      if (!phone) return '';
      const cleaned = String(phone).replace(/\D/g, ''); 
      return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    };

    const allOrders = await prisma.order.findMany({
      where: { status: 'Picked Up' },
      select: { customerPhone: true, pickedUpAt: true, outlet: true }
    });

    for (const c of customers) {
      const normC = normalizePhone(c.phone);
      const matched = allOrders.filter(o => normalizePhone(o.customerPhone) === normC);
      if (matched.length > 0) {
        console.log(`Customer ${c.name} (${c.phone}, ${c.gender}): ${matched.length} matched orders`);
        matched.forEach(o => console.log(`  - Order at ${o.outlet} on: ${o.pickedUpAt}`));
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
