import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET: Fetch all basata transactions, ordered by most recent
    if (req.method === 'GET') {
      const transactions = await prisma.basataTransaction.findMany({
        orderBy: { performedAt: 'desc' }
      });
      return res.status(200).json(transactions);
    }

    // POST: Log a new Basata Transaction
    if (req.method === 'POST') {
      const { category, serviceProvider, amount, referenceNumber } = req.body;

      if (!category || !serviceProvider || amount === undefined) {
        return res.status(400).json({ error: 'Missing required transaction fields.' });
      }

      const transaction = await prisma.basataTransaction.create({
        data: {
          category,
          serviceProvider,
          amount: parseFloat(amount),
          referenceNumber: referenceNumber || null
        }
      });

      return res.status(201).json(transaction);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [Basata]:", error);
    return res.status(500).json({ error: error.message });
  }
}
