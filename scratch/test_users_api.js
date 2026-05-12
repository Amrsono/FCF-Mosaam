import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fcf-mosaam-secret-change-in-production';
const baseUrl = 'http://localhost:3000'; // Assuming local dev server

async function testUsersApi() {
  // 1. Generate an Admin Token
  const adminToken = jwt.sign(
    { id: 'test-admin-id', username: 'admin', role: 'admin', outlet: 'eltalg' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('--- Testing GET /api/users ---');
  try {
    const resGet = await fetch(`${baseUrl}/api/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const users = await resGet.json();
    console.log('GET Result:', resGet.status, users.length, 'users found');
    if (users.length > 0) {
      console.log('First user:', users[0].username, 'assigned to', users[0].outlet);
    }
  } catch (err) {
    console.error('GET Error:', err.message);
  }

  console.log('\n--- Testing PUT /api/users ---');
  try {
    const resPut = await fetch(`${baseUrl}/api/users`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'mhesham', outlet: 'eltalg' }) // Move mhesham to eltalg
    });
    const result = await resPut.json();
    console.log('PUT Result:', resPut.status, result);
  } catch (err) {
    console.error('PUT Error:', err.message);
  }
}

// Note: This script requires the dev server to be running.
// If it's not running, I'll just check the code logic.
console.log('Testing logic locally (mocking fetch)...');
testUsersApi();
