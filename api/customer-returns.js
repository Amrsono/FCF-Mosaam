import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET: Fetch all customer returns
    if (req.method === 'GET') {
      const returns = await prisma.customerReturn.findMany({
        orderBy: { receivedAt: 'desc' }
      });
      return res.status(200).json(returns);
    }

    // POST: Log a new customer return (customer brought package back to station)
    if (req.method === 'POST') {
      const { orderId, customerPhone, customerName, description, reason } = req.body;

      const newReturn = await prisma.customerReturn.create({
        data: {
          orderId: orderId || null,
          customerPhone: customerPhone || '',
          customerName: customerName || 'Unknown',
          description: description || '',
          reason: reason || null
        }
      });

      return res.status(201).json(newReturn);
    }

    // PATCH: Mark a customer return as "Returned to Jumia"
    if (req.method === 'PATCH') {
      const { id } = req.body;

      const updated = await prisma.customerReturn.update({
        where: { id },
        data: { status: 'Returned to Jumia', returnedAt: new Date() }
      });

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [customer-returns]:", error);
    return res.status(500).json({ error: error.message });
  }
}
