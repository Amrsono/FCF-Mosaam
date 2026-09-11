import { prisma } from './_lib/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fcf-mosaam-secret-change-in-production';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    
    // Auth Check
    const authHeader = req.headers.authorization;
    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      } catch (err) {
        // Handle gracefully, might not need full auth for request if limit reached
      }
    }

    // POST /api/recharge (Create Request)
    if (req.method === 'POST' && !url.pathname.includes('/approve')) {
      const raw = req.body;
      const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const { amount, requestedBy } = body;

      if (!amount || amount <= 0 || !requestedBy) {
        return res.status(400).json({ error: 'Invalid amount or username.' });
      }

      const request = await prisma.rechargeRequest.create({
        data: {
          amount: Number(amount),
          requestedBy,
          status: 'pending'
        }
      });

      return res.status(201).json({ success: true, request });
    }

    // GET /api/recharge (List pending for Admin)
    if (req.method === 'GET') {
      if (!user || (user.username !== 'admin' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const pendingRequests = await prisma.rechargeRequest.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ requests: pendingRequests });
    }

    // PUT /api/recharge/approve
    if (req.method === 'PUT' && url.pathname.includes('/approve')) {
      if (!user || (user.username !== 'admin' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const raw = req.body;
      const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const { id } = body;

      if (!id) {
        return res.status(400).json({ error: 'Request ID is required.' });
      }

      // Start transaction to approve and increment limit
      const result = await prisma.$transaction(async (tx) => {
        const reqRecord = await tx.rechargeRequest.findUnique({ where: { id } });
        if (!reqRecord || reqRecord.status !== 'pending') {
          throw new Error('Request not found or not pending.');
        }

        // Update request status
        const updatedReq = await tx.rechargeRequest.update({
          where: { id },
          data: { status: 'approved' }
        });

        // Update limit
        let limitSetting = await tx.systemSettings.findUnique({
          where: { key: 'TRANSACTION_LIMIT' }
        });

        if (!limitSetting) {
          limitSetting = await tx.systemSettings.create({
            data: { key: 'TRANSACTION_LIMIT', value: updatedReq.amount.toString() }
          });
        } else {
          const currentLimit = parseInt(limitSetting.value, 10) || 0;
          await tx.systemSettings.update({
            where: { key: 'TRANSACTION_LIMIT' },
            data: { value: (currentLimit + updatedReq.amount).toString() }
          });
        }

        return updatedReq;
      });

      return res.status(200).json({ success: true, request: result });
    }

    return res.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('CRITICAL Recharge Error:', error);
    return res.status(500).json({ error: 'Server error during recharge process.' });
  }
}
