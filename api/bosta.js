import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET: Fetch all active and returned Bosta orders
    if (req.method === 'GET') {
      const bostaOrders = await prisma.bostaOrder.findMany({
        where: { isDeleted: false },
        orderBy: { receivedAt: 'desc' }
      });
      return res.status(200).json(bostaOrders);
    }

    // POST: Receive new Bosta order into inventory
    if (req.method === 'POST') {
      const { 
        id, customerPhone, customerName, description, totalValue, category, subcategory,
        email, address, tier,
        outlet, size, paymentMethod, orderCost,
        discountCode, discountAmount
      } = req.body;
      
      const newOrder = await prisma.$transaction(async (tx) => {
        // Upsert Customer logic: match by phone
        await tx.customer.upsert({
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

        const order = await tx.bostaOrder.create({
          data: {
            id,
            customerPhone,
            description,
            totalValue: parseFloat(totalValue),
            category,
            subcategory,
            outlet: outlet || "eltalg",
            size: size || "M",
            paymentMethod: paymentMethod || "Cash",
            orderCost: parseFloat(orderCost || 0),
            discountCode: discountCode || null,
            discountAmount: parseFloat(discountAmount || 0)
          }
        });

        if (discountCode) {
          await tx.discountCode.update({
            where: { code: discountCode.toUpperCase() },
            data: { usedCount: { increment: 1 } }
          }).catch(() => {});
        }

        return order;
      });

      return res.status(201).json(newOrder);
    }

    // PATCH: Update Bosta order status (Pick Up or Return)
    if (req.method === 'PATCH') {
      const { id, action } = req.body; // action: 'PICK_UP', 'RETURN', 'CANCEL', 'DELETE', or 'UPDATE_INFO'

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

      if (action === 'CANCEL') {
        const { reason } = req.body;
        const existingOrder = await prisma.bostaOrder.findUnique({ where: { id } });

        const order = await prisma.bostaOrder.update({
          where: { id },
          data: { 
            status: 'Cancelled', 
            cancellationReason: reason,
            returnedAt: new Date()
          }
        });

        if (existingOrder?.discountCode) {
          await prisma.discountCode.update({
            where: { code: existingOrder.discountCode.toUpperCase() },
            data: { usedCount: { decrement: 1 } }
          }).catch(() => {});
        }

        return res.status(200).json(order);
      }

      if (action === 'DELETE') {
        const { reason } = req.body;
        const existingOrder = await prisma.bostaOrder.findUnique({ where: { id } });

        const order = await prisma.bostaOrder.update({
          where: { id },
          data: { 
            isDeleted: true,
            deletionReason: reason
          }
        });

        if (existingOrder?.discountCode) {
          await prisma.discountCode.update({
            where: { code: existingOrder.discountCode.toUpperCase() },
            data: { usedCount: { decrement: 1 } }
          }).catch(() => {});
        }

        return res.status(200).json(order);
      }

      if (action === 'UPDATE_INFO') {
        const { newId, customerPhone, description, totalValue, category, subcategory, outlet, size, paymentMethod, orderCost } = req.body;

        // If phone changed, ensure customer exists (Upsert)
        if (customerPhone) {
          await prisma.customer.upsert({
            where: { phone: customerPhone },
            update: {},
            create: {
              phone: customerPhone,
              name: 'Unknown',
              tier: 'New'
            }
          });
        }

        const existingOrder = await prisma.bostaOrder.findUnique({ where: { id } });

        const updated = await prisma.bostaOrder.update({
          where: { id },
          data: {
            id: newId,
            customerPhone,
            description,
            totalValue: totalValue !== undefined ? parseFloat(totalValue) : undefined,
            category,
            subcategory,
            outlet,
            size,
            paymentMethod,
            orderCost: orderCost !== undefined ? parseFloat(orderCost) : undefined,
            discountCode: discountCode !== undefined ? (discountCode || null) : undefined,
            discountAmount: discountAmount !== undefined ? parseFloat(discountAmount) : undefined
          }
        });

        if (discountCode && discountCode !== existingOrder?.discountCode) {
          await prisma.discountCode.update({
            where: { code: discountCode.toUpperCase() },
            data: { usedCount: { increment: 1 } }
          }).catch(() => {});
        }

        // Also update any linked CallLogs if ID changed
        if (newId && newId !== id) {
          await prisma.callLog.updateMany({
            where: { orderId: id, orderSource: 'bosta' },
            data: { orderId: newId }
          });
        }

        return res.status(200).json(updated);
      }

      if (action === 'REVERT_TO_INVENTORY') {
        const order = await prisma.bostaOrder.update({
          where: { id },
          data: { 
            status: 'Inventory',
            returnedAt: null,
            cancellationReason: null 
          }
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
