import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

// Este controlador responde a mensajes TCP enviados por el Gateway.
// Cada @MessagePattern corresponde a un 'send()' del ClientProxy en el gateway.
@Controller()
export class ProductsController {
  @MessagePattern('get_products')
  getAll(@Payload() data: any) {
    // TODO: implementar lógica de negocio — consulta de catálogo de productos
    return {
      status: 'ok',
      service: 'products-service',
      data: [],
      message: 'Catálogo de productos — sin lógica de negocio (esqueleto)',
    };
  }

  @MessagePattern('health')
  health(@Payload() data: any) {
    return { status: 'UP', service: 'products-service', transport: 'TCP' };
  }
}
