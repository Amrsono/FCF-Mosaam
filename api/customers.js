import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET: Fetch all customers
    if (req.method === 'GET') {
      const customers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(customers);
    }

    // POST: Manually create a new customer
    if (req.method === 'POST') {
      const { phone, name, email, address, tier } = req.body;

      if (!phone || !name) {
        return res.status(400).json({ error: 'Phone and Name are required.' });
      }

      // Check if exists
      const existing = await prisma.customer.findUnique({ where: { phone } });
      if (existing) {
        return res.status(409).json({ error: 'Customer with this phone number already exists.' });
      }

      const newCustomer = await prisma.customer.create({
        data: {
          phone,
          name,
          email: email || null,
          address: address || null,
          tier: tier || 'New'
        }
      });

      return res.status(201).json(newCustomer);
    }

    // PATCH: Update customer details (like Address, Email, Tier)
    if (req.method === 'PATCH') {
      const { phone, data } = req.body;

      if (!phone || !data) return res.status(400).json({ error: 'Missing parameters' });

      // Handle Phone Number Change
      if (data.phone && data.phone !== phone) {
        const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
        if (existing) {
          return res.status(409).json({ error: 'New phone number already belongs to another customer.' });
        }

        const updatedCustomer = await prisma.$transaction(async (tx) => {
          // 1. Get current customer data
          const current = await tx.customer.findUnique({ where: { phone } });
          if (!current) throw new Error('Customer not found');

          // 2. Create new customer with new phone
          const next = await tx.customer.create({
            data: {
              ...current,
              id: undefined, // Let it generate a new UUID or we can reuse current.id if we manually handle it, but phone is the unique ref
              phone: data.phone,
              name: data.name || current.name,
              email: data.email !== undefined ? data.email : current.email,
              address: data.address !== undefined ? data.address : current.address,
              tier: data.tier || current.tier,
              deliveries: current.deliveries,
              bostaDeliveries: current.bostaDeliveries
            }
          });

          // 3. Update all related records
          await tx.order.updateMany({ where: { customerPhone: phone }, data: { customerPhone: data.phone } });
          await tx.bostaOrder.updateMany({ where: { customerPhone: phone }, data: { customerPhone: data.phone } });
          await tx.callLog.updateMany({ where: { customerPhone: phone }, data: { customerPhone: data.phone } });
          await tx.customerReturn.updateMany({ where: { customerPhone: phone }, data: { customerPhone: data.phone } });

          // 4. Delete old customer
          await tx.customer.delete({ where: { phone } });

          return next;
        });

        return res.status(200).json(updatedCustomer);
      }

      // Normal update (no phone change)
      const updatedCustomer = await prisma.customer.update({
        where: { phone },
        data // object containing name, email, tier, address, etc.
      });

      return res.status(200).json(updatedCustomer);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [customers]:", error);
    return res.status(500).json({ error: error.message });
  }
}
