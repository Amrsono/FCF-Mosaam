import dotenv from 'dotenv';
dotenv.config();

// Use dynamic import to ensure dotenv.config() runs first
const { default: handler } = await import('../api/health.js');

const req = {};
const res = {
  status(code) {
    console.log('Status:', code);
    return this;
  },
  json(data) {
    console.log('JSON Output:', JSON.stringify(data, null, 2));
    return this;
  }
};

console.log('Final Verification of Health Check...');
try {
  await handler(req, res);
} catch (err) {
  console.error('Unhandled Error:', err);
}
