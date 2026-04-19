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
