import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const today = '2026-05-12';
    const orders = await prisma.order.findMany({
      where: {
        status: 'Picked Up',
        pickedUpAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        }
      },
      select: { customerPhone: true }
    });
    
    const normalizePhone = (phone) => {
      if (!phone) return '';
      const cleaned = String(phone).replace(/\D/g, '').replace(/^0+/, ''); 
      return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    };

    const allCustomers = await prisma.customer.findMany({
      select: { phone: true, name: true, gender: true }
    });
    const customerMap = new Map();
    allCustomers.forEach(c => customerMap.set(normalizePhone(c.phone), c));

    console.log(`Found ${orders.length} orders today.`);
    
    let matchedCount = 0;
    let genderCounts = { Male: 0, Female: 0, Unknown: 0 };

    orders.forEach(o => {
      const norm = normalizePhone(o.customerPhone);
      const cust = customerMap.get(norm);
      if (cust) {
        matchedCount++;
        const g = cust.gender || 'Unknown';
        genderCounts[g] = (genderCounts[g] || 0) + 1;
      } else {
        genderCounts['Unknown']++;
      }
    });

    console.log('Match Results:', { matchedCount, genderCounts });
    
    const withGender = allCustomers.filter(c => c.gender !== 'Unknown');
    console.log('Customers with Genders in DB:', withGender.map(c => `${c.name} (${c.phone}): ${c.gender}`));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
