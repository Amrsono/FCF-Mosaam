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

    // Check if user is Admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only.' });
    }

    // GET: Fetch all users
    if (req.method === 'GET') {
      const users = await prisma.admin.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          outlet: true,
          createdAt: true
        },
        orderBy: { username: 'asc' }
      });
      return res.status(200).json(users);
    }

    // PUT: Update user outlet
    if (req.method === 'PUT') {
      const { username, outlet } = req.body;

      if (!username || !outlet) {
        return res.status(400).json({ error: 'Username and outlet are required.' });
      }

      // Verify outlet is valid
      const validOutlets = ['eltalg', 'tegara', 'mostashfa'];
      if (!validOutlets.includes(outlet)) {
        return res.status(400).json({ error: `Invalid outlet. Must be one of: ${validOutlets.join(', ')}` });
      }

      const updatedUser = await prisma.admin.update({
        where: { username },
        data: { outlet },
        select: {
          id: true,
          username: true,
          role: true,
          outlet: true
        }
      });

      // Log the action
      await prisma.userLog.create({
        data: {
          username: decoded.username,
          action: 'Update User Branch',
          details: JSON.stringify({ targetUser: username, newOutlet: outlet })
        }
      });

      return res.status(200).json(updatedUser);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [users]:", error);
    return res.status(500).json({ error: error.message });
  }
}
