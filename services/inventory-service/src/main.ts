import express from 'express';
import { BrokerClient } from './broker/broker.client';

const app = express();
const PORT = process.env.PORT || 3004;
const broker = BrokerClient.getInstance();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'inventory-service', brokerConnected: true });
});

async function bootstrap() {
  await broker.connect('inventory-service');
  app.listen(PORT, () => {
    console.log(`Inventory Service is running on port ${PORT}`);
  });
}

bootstrap();
