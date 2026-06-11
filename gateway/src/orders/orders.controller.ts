import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

// Este controlador actúa como proxy HTTP → TCP.
// Recibe requests HTTP y los reenvía al orders microservice vía TCP.
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS_SERVICE') private readonly ordersClient: ClientProxy,
  ) {}

  @Get()
  getAll(): Observable<any> {
    // Envía el mensaje 'get_orders' al microservicio orders (TCP)
    return this.ordersClient.send('get_orders', {});
  }

  @Post()
  create(@Body() createOrderDto: any): Observable<any> {
    // Envía el mensaje 'create_order' con el payload al microservicio orders
    return this.ordersClient.send('create_order', createOrderDto);
  }

  @Get('health')
  health(): Observable<any> {
    return this.ordersClient.send('health', {});
  }
}
