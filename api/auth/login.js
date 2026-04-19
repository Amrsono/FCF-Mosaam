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

    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      token,
      user: { id: admin.id, username: admin.username, role: admin.role }
    });

  } catch (error) {
    console.error('Auth Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server error during authentication.' });
    }
  }
}
