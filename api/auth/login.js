import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../_lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fcf-mosaam-secret-change-in-production';

export default async function handler(req, res) {
  try {
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

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, outlet: admin.outlet },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`[Login] Success: ${username}`);
    return res.status(200).json({
      token,
      user: { id: admin.id, username: admin.username, role: admin.role, outlet: admin.outlet }
    });

  } catch (error) {
    // Log the full error to Vercel Runtime Logs for troubleshooting
    console.error('CRITICAL Auth Error:', {
      message: error.message,
      code: error.code, // Useful for Prisma errors (e.g. P1001)
      stack: error.stack
    });

    if (!res.headersSent) {
      // In development, return more detail. In production, keep it generic but confirm it's a server failure.
      return res.status(500).json({ 
        error: 'Server error during authentication.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code || 'UNKNOWN_ERROR'
      });
    }
  }
}
