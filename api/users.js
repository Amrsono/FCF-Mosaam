import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

    // PUT: Update user outlet or password
    if (req.method === 'PUT') {
      const { username, outlet, password } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
      }

      const updateData = {};
      if (outlet) {
        const validOutlets = ['eltalg', 'tegara', 'mostashfa'];
        if (!validOutlets.includes(outlet)) {
          return res.status(400).json({ error: `Invalid outlet.` });
        }
        updateData.outlet = outlet;
      }

      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }

      const updatedUser = await prisma.admin.update({
        where: { username },
        data: updateData,
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
          action: password ? 'Update User Password' : 'Update User Branch',
          details: JSON.stringify({ targetUser: username, updatedFields: Object.keys(updateData) })
        }
      });

      return res.status(200).json(updatedUser);
    }

    // POST: Create a new user
    if (req.method === 'POST') {
      const { username, password, role, outlet } = req.body;

      if (!username || !password || !role || !outlet) {
        return res.status(400).json({ error: 'Username, password, role, and outlet are required.' });
      }

      // Validate role
      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin or staff.' });
      }

      // Check if user already exists
      const existingUser = await prisma.admin.findUnique({
        where: { username: username.toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await prisma.admin.create({
        data: {
          username: username.toLowerCase(),
          passwordHash,
          role,
          outlet
        }
      });

      // Log the creation
      await prisma.userLog.create({
        data: {
          username: decoded.username,
          action: 'Create User',
          details: JSON.stringify({ targetUser: username.toLowerCase(), role, outlet })
        }
      });

      return res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        outlet: newUser.outlet
      });
    }

    // DELETE: Delete a user
    if (req.method === 'DELETE') {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required for deletion.' });
      }

      // Prevent deleting the main admin or protected accounts
      const protectedUsers = ['admin', 'ezz'];
      if (protectedUsers.includes(username.toLowerCase())) {
        return res.status(403).json({ error: 'This user is protected and cannot be deleted.' });
      }

      // Check if user exists
      const targetUser = await prisma.admin.findUnique({
        where: { username: username.toLowerCase() }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      await prisma.admin.delete({
        where: { username: username.toLowerCase() }
      });

      // Log the deletion
      await prisma.userLog.create({
        data: {
          username: decoded.username,
          action: 'Delete User',
          details: JSON.stringify({ targetUser: username.toLowerCase() })
        }
      });

      return res.status(200).json({ message: 'User deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("API Error [users]:", error);
    return res.status(500).json({ error: error.message });
  }
}
