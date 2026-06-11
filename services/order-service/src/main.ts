import express from 'express';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'order-service' });
});

app.listen(PORT, () => {
  console.log(`Order Service is running on port ${PORT}`);
});
