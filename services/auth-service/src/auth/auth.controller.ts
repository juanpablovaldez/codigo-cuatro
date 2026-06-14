import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

// Este controlador responde a mensajes TCP enviados por el Gateway.
// Cada @MessagePattern corresponde a un 'send()' del ClientProxy en el gateway.
@Controller()
export class AuthController {
  @MessagePattern('get_auth')
  getAll(@Payload() data: any) {
    // TODO: implementar lógica de negocio — consulta de pedidos del usuario
    return {
      status: 'ok',
      service: 'auth-service',
      data: [],
      message: 'Listado de pedidos — sin lógica de negocio (esqueleto)',
    };
  }

  @MessagePattern('create_auth')
  create(@Payload() createOrderDto: any) {
    // TODO: implementar lógica de negocio — creación de pedido con validación de stock y pago
    return {
      status: 'ok',
      service: 'auth-service',
      data: { id: 'order-stub-id', ...createOrderDto },
      message: 'Pedido creado (stub) — sin lógica de negocio',
    };
  }

  @MessagePattern('health')
  health(@Payload() data: any) {
    return { status: 'UP', service: 'auth-service', transport: 'TCP' };
  }
}
