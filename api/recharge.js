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

    // POST /api/recharge (Create Request or Admin Direct Recharge)
    if (req.method === 'POST' && !url.pathname.includes('/approve')) {
      const raw = req.body;
      const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const { amount, requestedBy, direct } = body;

      if (!amount || Number(amount) <= 0 || !requestedBy) {
        return res.status(400).json({ error: 'Invalid amount or username.' });
      }

      const numAmount = Number(amount);
      const isAdmin = user && (user.role === 'admin' || user.username?.toLowerCase() === 'admin');

      // Admin direct credit addition without pending approval
      if (direct && isAdmin) {
        const result = await prisma.$transaction(async (tx) => {
          const request = await tx.rechargeRequest.create({
            data: {
              amount: numAmount,
              requestedBy,
              status: 'approved'
            }
          });

          let limitSetting = await tx.systemSettings.findUnique({
            where: { key: 'TRANSACTION_LIMIT' }
          });

          if (!limitSetting) {
            limitSetting = await tx.systemSettings.create({
              data: { key: 'TRANSACTION_LIMIT', value: (10000 + numAmount).toString() }
            });
          } else {
            const currentLimit = parseInt(limitSetting.value, 10) || 10000;
            await tx.systemSettings.update({
              where: { key: 'TRANSACTION_LIMIT' },
              data: { value: (currentLimit + numAmount).toString() }
            });
          }

          return request;
        });

        return res.status(201).json({ success: true, request: result, direct: true });
      }

      // Standard request (pending approval)
      const request = await prisma.rechargeRequest.create({
        data: {
          amount: numAmount,
          requestedBy,
          status: 'pending'
        }
      });

      return res.status(201).json({ success: true, request });
    }

    // GET /api/recharge
    if (req.method === 'GET') {
      const isAuthorizedUser = user && (
        user.role === 'admin' || 
        user.username?.toLowerCase() === 'admin' || 
        user.username?.toLowerCase() === 'ezz'
      );

      if (!isAuthorizedUser) {
        return res.status(403).json({ error: 'Forbidden. Admin or Ezz access required.' });
      }

      const searchParams = Object.fromEntries(url.searchParams);

      // Status check endpoint for counter status modal
      if (searchParams.status === 'true') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

        const [
          limitSetting,
          orderCount,
          bostaOrderCount,
          basataTxCount,
          customerCount,
          monthlyOrders,
          monthlyBosta,
          monthlyBasata,
          monthlyCustomers,
          pendingRequestsCount
        ] = await Promise.all([
          prisma.systemSettings.findUnique({ where: { key: 'TRANSACTION_LIMIT' } }),
          prisma.order.count(),
          prisma.bostaOrder.count(),
          prisma.basataTransaction.count(),
          prisma.customer.count(),
          prisma.order.count({ where: { receivedAt: { gte: startOfMonth } } }),
          prisma.bostaOrder.count({ where: { receivedAt: { gte: startOfMonth } } }),
          prisma.basataTransaction.count({ where: { performedAt: { gte: startOfMonth } } }),
          prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
          prisma.rechargeRequest.count({ where: { status: 'pending' } })
        ]);

        const limit = limitSetting ? parseInt(limitSetting.value, 10) : 10000;
        const totalConsumed = orderCount + bostaOrderCount + basataTxCount + customerCount;
        const consumedThisMonth = monthlyOrders + monthlyBosta + monthlyBasata + monthlyCustomers;
        const creditRemaining = Math.max(0, limit - totalConsumed);

        return res.status(200).json({
          success: true,
          status: {
            limit,
            totalConsumed,
            creditRemaining,
            consumedThisMonth,
            pendingRequestsCount,
            breakdown: {
              monthly: {
                jumia: monthlyOrders,
                bosta: monthlyBosta,
                basata: monthlyBasata,
                customers: monthlyCustomers
              },
              lifetime: {
                jumia: orderCount,
                bosta: bostaOrderCount,
                basata: basataTxCount,
                customers: customerCount
              }
            }
          }
        });
      }

      // Admin only: List requests
      if (user.username?.toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
      }

      const { all } = searchParams;
      const whereClause = all === 'true' ? {} : { status: 'pending' };

      const [requests, pendingCount, allCount] = await Promise.all([
        prisma.rechargeRequest.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.rechargeRequest.count({
          where: { status: 'pending' }
        }),
        prisma.rechargeRequest.count()
      ]);

      return res.status(200).json({ requests, pendingCount, allCount });
    }

    // PUT /api/recharge/approve or /api/recharge/reject
    if (req.method === 'PUT') {
      if (!user || user.username?.toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
      }

      const raw = req.body;
      const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const { id } = body;

      if (!id) {
        return res.status(400).json({ error: 'Request ID is required.' });
      }

      if (url.pathname.includes('/reject')) {
        const updatedReq = await prisma.rechargeRequest.update({
          where: { id },
          data: { status: 'rejected' }
        });
        return res.status(200).json({ success: true, request: updatedReq });
      }

      if (url.pathname.includes('/approve') || !url.pathname.includes('/reject')) {
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
    }

    return res.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('CRITICAL Recharge Error:', error);
    return res.status(500).json({ error: 'Server error during recharge process.' });
  }
}
