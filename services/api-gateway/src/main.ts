import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware
app.use((req, res, next) => {
  console.log(`[API Gateway] Routing request: ${req.method} ${req.url}`);
  next();
});

// Auth Service: /auth/* -> port 3001
app.use(
  '/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/auth': '',
    },
  })
);

// Inventory Service: /inventory/* -> port 3004
app.use(
  '/inventory',
  createProxyMiddleware({
    target: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: {
      '^/inventory': '',
    },
  })
);

// Orders Service: /orders/* -> port 3005
app.use(
  '/orders',
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/orders': '',
    },
  })
);

// Basic check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'api-gateway' });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});
