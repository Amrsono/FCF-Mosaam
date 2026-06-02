import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './_lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fcf-mosaam-secret-change-in-production';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    
    // Route 1: /api/auth/me
    if (url.pathname.includes('/me')) {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided.' });
      }

      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return res.status(200).json({ user: decoded });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
    }

    // Route 3: /api/auth/confirm-outlet
    if (url.pathname.includes('/confirm-outlet')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }

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

      const raw = req.body;
      const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const { outlet } = body;

      if (!outlet) {
        return res.status(400).json({ error: 'Outlet is required.' });
      }

      const newToken = jwt.sign(
        { id: decoded.id, username: decoded.username, role: decoded.role, outlet: outlet },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Log the successful login with chosen outlet
      await prisma.userLog.create({
        data: {
          username: decoded.username,
          action: 'Select Session Outlet',
          details: JSON.stringify({ outlet }),
          outlet: outlet
        }
      });

      return res.status(200).json({
        token: newToken,
        user: { id: decoded.id, username: decoded.username, role: decoded.role, outlet: outlet }
      });
    }

    // Route 2: /api/auth/login
    if (url.pathname.includes('/login')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }

      const raw = req.body;
      const body =
        typeof raw === 'string'
          ? (() => {
              try {
                return JSON.parse(raw || '{}');
              } catch {
                return {};
              }
            })()
          : raw && typeof raw === 'object'
            ? raw
            : {};

      const { username, password } = body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const normalizedUsername = username.toLowerCase();
      const admin = await prisma.admin.findUnique({ where: { username: normalizedUsername } });

      if (!admin) {
        console.warn(`[Login] User not found: ${username}`);
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const passwordValid = await bcrypt.compare(password, admin.passwordHash);

      if (!passwordValid) {
        console.warn(`[Login] Invalid password for: ${username}`);
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const userOutlet = admin.role === 'admin' ? 'All' : admin.outlet;

      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: admin.role, outlet: userOutlet },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Log the successful login
      await prisma.userLog.create({
        data: {
          username: admin.username,
          action: 'User Login',
          details: JSON.stringify({ outlet: userOutlet, role: admin.role }),
          outlet: userOutlet
        }
      });

      console.log(`[Login] Success: ${username}`);
      return res.status(200).json({
        token,
        user: { id: admin.id, username: admin.username, role: admin.role, outlet: userOutlet }
      });
    }

    return res.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('CRITICAL Auth Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error during authentication.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code || 'UNKNOWN_ERROR'
      });
    }
  }
}
