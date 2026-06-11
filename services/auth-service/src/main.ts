import express from 'express';
import { BrokerClient } from './broker/broker.client';

const app = express();
const PORT = process.env.PORT || 3001;
const broker = BrokerClient.getInstance();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'auth-service', brokerConnected: true });
});

async function bootstrap() {
  await broker.connect('auth-service');
  app.listen(PORT, () => {
    console.log(`Auth Service is running on port ${PORT}`);
  });
}

bootstrap();
