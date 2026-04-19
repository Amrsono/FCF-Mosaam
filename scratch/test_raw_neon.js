import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
dotenv.config();

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

console.log('Testing raw Neon Pool connection...');
const pool = new Pool({ connectionString });

try {
  const { rows } = await pool.query('SELECT 1 as result');
  console.log('Raw Connection Success:', rows);
} catch (err) {
  console.error('Raw Connection Error:', err);
} finally {
  await pool.end();
}
