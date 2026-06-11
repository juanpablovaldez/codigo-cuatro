import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

// Este controlador actúa como proxy HTTP → TCP.
// Recibe requests HTTP y los reenvía al products microservice vía TCP.
@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  @Get()
  getAll(): Observable<any> {
    // Envía el mensaje 'get_products' al microservicio products (TCP)
    return this.productsClient.send('get_products', {});
  }

  @Get('health')
  health(): Observable<any> {
    return this.productsClient.send('health', {});
  }
}
