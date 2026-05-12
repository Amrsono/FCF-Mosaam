import 'dotenv/config';
import { prisma } from '../api/_lib/prisma.js';

async function main() {
  try {
    const phone = '1020567975';
    const orders = await prisma.order.findMany({
      where: { customerPhone: { contains: phone } }
    });
    console.log(`Orders for ${phone}:`, orders.map(o => ({ id: o.id, status: o.status, pickedUpAt: o.pickedUpAt, outlet: o.outlet })));
    
    const bosta = await prisma.bostaOrder.findMany({
      where: { customerPhone: { contains: phone } }
    });
    console.log(`Bosta Orders for ${phone}:`, bosta.map(o => ({ id: o.id, status: o.status, pickedUpAt: o.pickedUpAt, outlet: o.outlet })));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
