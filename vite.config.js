import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url.startsWith('/api/')) return next();

          // Enhance res with Vercel-like helpers
          const mockRes = res;
          mockRes.status = (code) => {
            mockRes.statusCode = code;
            return mockRes;
          };
          mockRes.json = (data) => {
            if (!mockRes.headersSent) {
              mockRes.setHeader('Content-Type', 'application/json');
            }
            mockRes.end(JSON.stringify(data));
            return mockRes;
          };

          // Basic body parser for POST/PATCH
          if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const data = Buffer.concat(buffers).toString();
            try {
              req.body = data ? JSON.parse(data) : {};
            } catch (e) {
              req.body = data;
            }
          }

          // Map URL to file path (e.g., /api/auth/login -> ./api/auth/login.js)
          const urlPath = req.url.split('?')[0];
          let filePath = path.join(process.cwd(), urlPath + '.js');
          
          if (!fs.existsSync(filePath)) {
            const dirPath = path.join(process.cwd(), urlPath);
            if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
              filePath = path.join(dirPath, 'index.js');
            }
          }

          if (fs.existsSync(filePath)) {
            try {
              // Dynamic import the handler
              const module = await import('file://' + filePath.replace(/\\/g, '/') + '?t=' + Date.now());
              const handler = module.default;
              if (typeof handler === 'function') {
                await handler(req, mockRes);
                return;
              }
            } catch (err) {
              console.error(`[Local API Error] ${urlPath}:`, err);
              if (!mockRes.headersSent) {
                mockRes.status(500).json({ error: 'Local API Execution Error', details: err.message });
              }
              return;
            }
          } else {
            console.warn(`[Local API] 404: ${urlPath} (Looked for ${filePath})`);
          }

          next();
        });
      },
    },
  ],
});
