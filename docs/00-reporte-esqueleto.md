# Reporte de Implementación del Esqueleto de Microservicios

Este reporte documenta la implementación del esqueleto de microservicios del sistema e-commerce multivendedor. La arquitectura está basada en **NestJS con `@nestjs/microservices`** y comunicación **TCP** entre el API Gateway y los servicios internos.

La fuente de verdad arquitectónica es el documento [`06-microservicios-tradicionales.md`](./06-microservicios-tradicionales.md), que define 9 servicios totales. En este esqueleto se implementaron los 2 servicios de mayor prioridad más el gateway.

---

## 1. Decisiones Arquitectónicas Clave

### Autenticación: delegada a AWS Cognito
El servicio `auth-service` definido en el documento 06 **no se implementa como microservicio interno**. La autenticación y la emisión de JWT quedan delegadas completamente a **AWS Cognito** (servicio administrado de AWS). El Gateway verifica los tokens JWT emitidos por Cognito en cada request entrante.

**Justificación**: Cognito elimina la complejidad operativa de gestionar rotación de tokens, MFA, password policies y compliance, siguiendo la estrategia de usar servicios administrados de AWS definida en la Fase 4 del TFI.

### Transporte: TCP (NestJS Microservices)
La comunicación entre el Gateway y los microservicios usa **TCP con `@nestjs/microservices`** en lugar de HTTP/REST puro. Esto sigue el patrón nativo de NestJS para microservicios y simplifica la evolución futura hacia RabbitMQ/AMQP (Fase 2B del TFI).

---

## 2. Estructura de Carpetas

```txt
codigo-cuatro/
├── .env.example                         # Variables de entorno (plantilla)
├── docker-compose.yml                   # Orquestador raíz
├── docs/
│   └── 00-reporte-esqueleto.md          # Este reporte
├── gateway/                             # NestJS API Gateway (HTTP → TCP)
│   ├── src/
│   │   ├── app.module.ts                # ClientsModule con config TCP
│   │   ├── main.ts                      # Bootstrap HTTP (puerto 3000)
│   │   ├── products/
│   │   │   ├── products.module.ts
│   │   │   └── products.controller.ts   # Proxy HTTP → TCP hacia products
│   │   └── orders/
│   │       ├── orders.module.ts
│   │       └── orders.controller.ts     # Proxy HTTP → TCP hacia orders
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
└── services/
    ├── products/                         # NestJS microservice — catálogo (Puerto TCP 3003)
    │   ├── src/
    │   │   ├── app.module.ts
    │   │   ├── main.ts                   # Bootstrap TCP (sin HTTP)
    │   │   └── products/
    │   │       ├── products.module.ts
    │   │       └── products.controller.ts  # @MessagePattern handlers
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    └── orders/                           # NestJS microservice — pedidos (Puerto TCP 3005)
        ├── src/
        │   ├── app.module.ts
        │   ├── main.ts                   # Bootstrap TCP (sin HTTP)
        │   └── orders/
        │       ├── orders.module.ts
        │       └── orders.controller.ts  # @MessagePattern handlers
        ├── Dockerfile
        ├── package.json
        └── tsconfig.json
```

---

## 3. Servicios Implementados vs. Documentados

El documento [`06-microservicios-tradicionales.md`](./06-microservicios-tradicionales.md) define 9 servicios. En este esqueleto se implementaron los de mayor criticidad para el flujo de checkout:

| Servicio (doc 06) | Puerto | Estado en esqueleto | Notas |
|-------------------|--------|---------------------|-------|
| `auth-service` | 3001 | ⚡ Delegado a AWS Cognito | No se implementa internamente |
| `user-service` | 3002 | 🔜 Pendiente | Fase futura |
| `catalog-service` | 3003 | ✅ Implementado como `products/` | Renombrado para alinear con estructura objetivo |
| `inventory-service` | 3004 | 🔜 Pendiente (incluido lógicamente en `products/`) | Se separará en fase posterior |
| `order-service` | 3005 | ✅ Implementado como `orders/` | |
| `payment-service` | 3006 | 🔜 Pendiente | Fase futura |
| `notification-service` | 3007 | 🔜 Pendiente | Fase futura |
| `storage-service` | 3008 | 🔜 Pendiente | Fase futura |
| `admin-service` | 3009 | 🔜 Pendiente | Fase futura |

---

## 4. Flujo de Comunicación

```
Cliente HTTP
    │
    ▼ HTTPS (puerto 3000)
┌─────────────────────────────────────┐
│  gateway/                           │
│  NestJS HTTP Server                 │
│  Verifica JWT (AWS Cognito)         │
│                                     │
│  GET /products  →  TCP → products/ │
│  GET /orders    →  TCP → orders/   │
│  POST /orders   →  TCP → orders/   │
└──────────────┬──────────────────────┘
               │ TCP
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│  products/   │  │  orders/     │
│  TCP :3003   │  │  TCP :3005   │
│  @MessageP.  │  │  @MessageP.  │
└──────────────┘  └──────────────┘
```

---

## 5. Historial de Commits de esta Feature

Los siguientes commits fueron realizados en la rama `feature/nestjs-microservices-migration`:

```txt
feat: add NestJS orders microservice (TCP transport, port 3005)
feat: add NestJS products microservice (TCP transport, port 3003)
feat: add NestJS gateway with TCP client proxies for products and orders
feat: remove auth-service and api-gateway Express stubs
```

Y los commits previos del esqueleto inicial (rama `main`):
```txt
chore: add docker-compose and base Dockerfiles
feat: configure api-gateway reverse proxy stub         ← reemplazado por gateway/ NestJS
feat: configure mock message broker client connection  ← reemplazado por @nestjs/microservices TCP
feat: initialize skeletons for auth, order, inventory  ← reemplazado por products/ y orders/ NestJS
```
