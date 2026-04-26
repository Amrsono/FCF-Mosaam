import { prisma } from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    // GET: fetch all non-closed call logs
    if (req.method === 'GET') {
      const showAll = req.query?.all === 'true';
      const logs = await prisma.callLog.findMany({
        where: showAll ? {} : { isClosed: false },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(logs);
    }

    // POST: create a new call log entry (first time an order is flagged)
    if (req.method === 'POST') {
      const { orderId, orderSource, customerPhone } = req.body;
      if (!orderId || !customerPhone) {
        return res.status(400).json({ error: 'orderId and customerPhone are required' });
      }

      // Upsert: avoid duplicates for the same order
      const existing = await prisma.callLog.findFirst({
        where: { orderId, isClosed: false }
      });
      if (existing) return res.status(200).json(existing);

      const log = await prisma.callLog.create({
        data: { orderId, orderSource: orderSource || 'jumia', customerPhone }
      });
      return res.status(201).json(log);
    }

    // PATCH: update a call log (TAKE | RESOLVE | CLOSE)
    if (req.method === 'PATCH') {
      const { id, action, agentName, resolution, notes } = req.body;
      if (!id || !action) return res.status(400).json({ error: 'id and action are required' });

      if (action === 'TAKE') {
        if (!agentName) return res.status(400).json({ error: 'agentName required' });
        const updated = await prisma.callLog.update({
          where: { id },
          data: { agentName, takenAt: new Date() }
        });
        return res.status(200).json(updated);
      }

      if (action === 'RESOLVE') {
        if (!resolution) return res.status(400).json({ error: 'resolution required' });
        const updated = await prisma.callLog.update({
          where: { id },
          data: { resolution, notes: notes || null, resolvedAt: new Date() }
        });
        return res.status(200).json(updated);
      }

      if (action === 'CLOSE') {
        const updated = await prisma.callLog.update({
          where: { id },
          data: { isClosed: true }
        });
        return res.status(200).json(updated);
      }

      if (action === 'REOPEN') {
        const updated = await prisma.callLog.update({
          where: { id },
          data: { 
            resolution: null, 
            notes: null, 
            resolvedAt: null 
          }
        });
        return res.status(200).json(updated);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('API Error [call-logs]:', error);
    return res.status(500).json({ error: error.message });
  }
}
