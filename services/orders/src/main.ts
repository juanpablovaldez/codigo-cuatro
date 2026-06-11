import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Este servicio NO expone HTTP. Escucha mensajes TCP directamente.
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: Number(process.env.PORT) || 3005,
      },
    },
  );

  await app.listen();
  console.log('[Orders Service] TCP microservice listening on port 3005');
}

bootstrap();
