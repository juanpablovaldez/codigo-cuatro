import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CatalogModule } from './catalog/catalog.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CATALOG_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.CATALOG_SERVICE_HOST || 'localhost',
          port: Number(process.env.CATALOG_SERVICE_PORT) || 3003,
        },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ORDER_SERVICE_HOST || 'localhost',
          port: Number(process.env.ORDER_SERVICE_PORT) || 3005,
        },
      },
    ]),
    CatalogModule,
    OrderModule,
  ],
})
export class AppModule {}
