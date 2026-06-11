import express from 'express';
import { BrokerClient } from './broker/broker.client';

const app = express();
const PORT = process.env.PORT || 3005;
const broker = BrokerClient.getInstance();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'order-service', brokerConnected: true });
});

async function bootstrap() {
  await broker.connect('order-service');
  app.listen(PORT, () => {
    console.log(`Order Service is running on port ${PORT}`);
  });
}

bootstrap();
