import { prisma } from './_lib/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fcf-mosaam-secret-change-in-production';

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
      const { phone, name, email, address, tier, gender } = req.body;

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
          tier: tier || 'New',
          gender: gender || 'Unknown'
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
              phone: data.phone,
              name: data.name || current.name,
              email: data.email !== undefined ? data.email : current.email,
              address: data.address !== undefined ? data.address : current.address,
              tier: data.tier || current.tier,
              gender: data.gender || current.gender,
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
      const { name, email, address, tier, gender } = data;
      const updatedCustomer = await prisma.customer.update({
        where: { phone },
        data: {
          name,
          email: email !== undefined ? email : undefined,
          address: address !== undefined ? address : undefined,
          tier,
          gender
        }
      });

      return res.status(200).json(updatedCustomer);
    }
    // DELETE: Delete a customer and all their related records
    if (req.method === 'DELETE') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }

      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only.' });
      }

      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Phone is required for deletion.' });
      }

      // Delete customer and all related records in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete CallLogs
        await tx.callLog.deleteMany({ where: { customerPhone: phone } });
        // Delete CustomerReturns
        await tx.customerReturn.deleteMany({ where: { customerPhone: phone } });
        // Delete Orders
        await tx.order.deleteMany({ where: { customerPhone: phone } });
        // Delete BostaOrders
        await tx.bostaOrder.deleteMany({ where: { customerPhone: phone } });
        // Delete Customer
        await tx.customer.delete({ where: { phone } });
      });

      // Log the deletion
      await prisma.userLog.create({
        data: {
          username: decoded.username,
          action: 'Delete Customer',
          details: JSON.stringify({ phone })
        }
      });

      return res.status(200).json({ message: 'Customer deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [customers]:", error);
    return res.status(500).json({ error: error.message });
  }
}
