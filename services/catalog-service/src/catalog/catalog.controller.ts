import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

// Este controlador responde a mensajes TCP enviados por el Gateway.
// Cada @MessagePattern corresponde a un 'send()' del ClientProxy en el gateway.
@Controller()
export class CatalogController {
  @MessagePattern('get_catalog')
  getAll(@Payload() data: any) {
    // TODO: implementar lógica de negocio — consulta de catálogo de productos
    return {
      status: 'ok',
      service: 'catalog-service',
      data: [],
      message: 'Catálogo de productos — sin lógica de negocio (esqueleto)',
    };
  }

  @MessagePattern('health')
  health(@Payload() data: any) {
    return { status: 'UP', service: 'catalog-service', transport: 'TCP' };
  }
}
