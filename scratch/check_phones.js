import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const orders = await prisma.order.findMany({ take: 5, select: { customerPhone: true } });
    console.log('Jumia Order Phones:', orders.map(o => o.customerPhone));
    
    const bosta = await prisma.bostaOrder.findMany({ take: 5, select: { customerPhone: true } });
    console.log('Bosta Order Phones:', bosta.map(o => o.customerPhone));
    
    const customers = await prisma.customer.findMany({ take: 5, select: { phone: true } });
    console.log('Customer Phones:', customers.map(c => c.phone));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
