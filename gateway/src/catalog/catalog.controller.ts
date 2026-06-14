import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

// Este controlador actúa como proxy HTTP → TCP.
// Recibe requests HTTP y los reenvía al catalog microservice vía TCP.
@Controller('catalog')
export class CatalogController {
  constructor(
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
  ) {}

  @Get()
  getAll(): Observable<any> {
    // Envía el mensaje 'get_catalog' al microservicio catalog (TCP)
    return this.catalogClient.send('get_catalog', {});
  }

  @Get('health')
  health(): Observable<any> {
    return this.catalogClient.send('health', {});
  }
}
