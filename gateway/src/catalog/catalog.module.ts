import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CatalogController } from './catalog.controller';

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
    ]),
  ],
  controllers: [CatalogController],
})
export class CatalogModule {}
