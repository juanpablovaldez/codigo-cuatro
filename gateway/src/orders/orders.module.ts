import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ORDERS_SERVICE_HOST || 'localhost',
          port: Number(process.env.ORDERS_SERVICE_PORT) || 3005,
        },
      },
    ]),
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
