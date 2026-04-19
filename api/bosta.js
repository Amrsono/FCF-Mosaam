import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET: Fetch all active and returned Bosta orders
    if (req.method === 'GET') {
      const bostaOrders = await prisma.bostaOrder.findMany({
        orderBy: { receivedAt: 'desc' }
      });
      return res.status(200).json(bostaOrders);
    }

    // POST: Receive new Bosta order into inventory
    if (req.method === 'POST') {
      const { id, customerPhone, customerName, description, totalValue, category, email, address, tier } = req.body;
      
      // Upsert Customer logic: match by phone
      await prisma.customer.upsert({
        where: { phone: customerPhone },
        update: {},
        create: {
          phone: customerPhone,
          name: customerName || 'Unknown',
          email: email || null,
          address: address || null,
          tier: tier || 'New'
        }
      });

      // Create Bosta Order
      const newOrder = await prisma.bostaOrder.create({
        data: {
          id,
          customerPhone,
          description,
          totalValue: parseFloat(totalValue),
          category
        }
      });

      return res.status(201).json(newOrder);
    }

    // PATCH: Update Bosta order status (Pick Up or Return)
    if (req.method === 'PATCH') {
      const { id, action } = req.body; // action: 'PICK_UP' or 'RETURN'

      if (action === 'PICK_UP') {
        const updated = await prisma.$transaction(async (tx) => {
           const order = await tx.bostaOrder.update({
             where: { id },
             data: { status: 'Picked Up', pickedUpAt: new Date() }
           });
           
           // Increment customer bosta delivery count separately!
           await tx.customer.update({
             where: { phone: order.customerPhone },
             data: { bostaDeliveries: { increment: 1 } }
           });

           return order;
        });
        return res.status(200).json(updated);
      }

      if (action === 'RETURN') {
        const order = await prisma.bostaOrder.update({
           where: { id },
           data: { status: 'Returned', returnedAt: new Date() }
        });
        return res.status(200).json(order);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [bosta]:", error);
    return res.status(500).json({ error: error.message });
  }
}
