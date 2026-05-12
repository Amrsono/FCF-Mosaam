import { prisma } from '../api/_lib/prisma.js';

async function main() {
  const allOrders = await prisma.order.findMany({
    where: { isDeleted: false }
  });

  const outlets = ['eltalg', 'tegara', 'mostashfa'];
  
  const normalizeOutlet = (val) => {
    if (!val || val === 'eltalg' || val === 'Banha 1' || val === 'وبور الثلج' || val === 'وبور التلج') return 'eltalg';
    if (val === 'tegara' || val === 'Banha 2' || val === 'تجارة' || val === 'تجاره') return 'tegara';
    if (val === 'mostashfa' || val === 'Banha 3' || val === 'المستشفي' || val === 'المستشفى') return 'mostashfa';
    return 'other';
  };

  const results = outlets.map(outlet => {
    const orders = allOrders.filter(o => normalizeOutlet(o.outlet) === outlet);
    const total = orders.length;
    const pickedUp = orders.filter(o => o.status === 'Picked Up').length;
    const returned = orders.filter(o => o.status === 'Returned').length;
    const cancelled = orders.filter(o => o.status === 'Cancelled').length;
    const inventory = orders.filter(o => o.status === 'Inventory').length;
    
    const sum = pickedUp + returned + cancelled + inventory;
    const diff = total - sum;

    return {
      outlet,
      total,
      pickedUp,
      returned,
      cancelled,
      inventory,
      sum,
      diff
    };
  });

  console.table(results);
}

main().catch(console.error).finally(() => prisma.$disconnect());
