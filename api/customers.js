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
