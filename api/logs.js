import jwt from 'jsonwebtoken';
import { prisma } from './_lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fcf-mosaam-secret-change-in-production';

export default async function handler(req, res) {
  try {
    // Authenticate Request
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

    // GET: Fetch all logs (Admin Only)
    if (req.method === 'GET') {
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only.' });
      }

      const logs = await prisma.userLog.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(logs);
    }

    // POST: Create a log (Any authenticated user)
    if (req.method === 'POST') {
      const { action, details } = req.body;

      if (!action) {
        return res.status(400).json({ error: 'Action is required.' });
      }

      const log = await prisma.userLog.create({
        data: {
          username: decoded.username,
          action,
          details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        },
      });

      return res.status(201).json(log);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [logs]:", error);
    return res.status(500).json({ error: error.message });
  }
}
