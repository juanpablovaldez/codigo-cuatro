import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

// Este controlador actúa como proxy HTTP → TCP.
// Recibe requests HTTP y los reenvía al order microservice vía TCP.
@Controller('orders')
export class OrderController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @Get()
  getAll(): Observable<any> {
    // Envía el mensaje 'get_orders' al microservicio order (TCP)
    return this.orderClient.send('get_orders', {});
  }

  @Post()
  create(@Body() createOrderDto: any): Observable<any> {
    // Envía el mensaje 'create_order' con el payload al microservicio order
    return this.orderClient.send('create_order', createOrderDto);
  }

  @Get('health')
  health(): Observable<any> {
    return this.orderClient.send('health', {});
  }
}
