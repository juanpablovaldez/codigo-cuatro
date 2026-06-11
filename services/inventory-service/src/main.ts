import express from 'express';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'inventory-service' });
});

app.listen(PORT, () => {
  console.log(`Inventory Service is running on port ${PORT}`);
});
