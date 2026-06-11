import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PRODUCTS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.PRODUCTS_SERVICE_HOST || 'localhost',
          port: Number(process.env.PRODUCTS_SERVICE_PORT) || 3003,
        },
      },
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ORDERS_SERVICE_HOST || 'localhost',
          port: Number(process.env.ORDERS_SERVICE_PORT) || 3005,
        },
      },
    ]),
    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}
