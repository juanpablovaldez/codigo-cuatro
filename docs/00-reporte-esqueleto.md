---
title: "Artefacto — Reporte de Esqueleto de Microservicios"
tags: [artefacto, esqueleto, microservicios, nestjs, commits, fase-2]
issues: ["#4", "#9"]
estado: completo
relacionado:
  - "[[06-microservicios-tradicionales]]"
  - "[[02-arquitectura-inicial]]"
---

# Reporte de Implementación del Esqueleto de Microservicios

Este reporte documenta la implementación del esqueleto de microservicios del sistema e-commerce multivendedor. La arquitectura está basada en **NestJS con `@nestjs/microservices`** y comunicación **TCP** entre el API Gateway y los servicios internos.

La fuente de verdad arquitectónica es el documento [`06-microservicios-tradicionales.md`](./06-microservicios-tradicionales.md), que define 9 servicios totales. En este esqueleto se implementaron los servicios con su estructura correspondiente, utilizando stubs funcionales en NestJS.

---

## 1. Decisiones Arquitectónicas Clave

### Autenticación: delegada a AWS Cognito
El servicio `auth-service` cuenta con un esqueleto (stub), pero la autenticación y la emisión de JWT quedarán delegadas completamente a **AWS Cognito** (servicio administrado de AWS). El Gateway verificará los tokens JWT emitidos por Cognito en cada request entrante.

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
│   │   ├── catalog/
│   │   │   ├── catalog.module.ts
│   │   │   └── catalog.controller.ts    # Proxy HTTP → TCP hacia catalog
│   │   └── order/
│   │       ├── order.module.ts
│   │       └── order.controller.ts      # Proxy HTTP → TCP hacia order
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
└── services/
    ├── admin-service/                    # NestJS microservice — admin (Stub, TCP 3011)
    ├── auth-service/                     # NestJS microservice — auth (Stub, TCP 3008)
    ├── catalog-service/                  # NestJS microservice — catálogo (TCP 3003)
    ├── inventory-service/                # NestJS microservice — inventario (Stub, TCP 3004)
    ├── notification-service/             # NestJS microservice — notificaciones (Stub, TCP 3007)
    ├── order-service/                    # NestJS microservice — pedidos (TCP 3005)
    ├── payment-service/                  # NestJS microservice — pagos (Stub, TCP 3006)
    ├── storage-service/                  # NestJS microservice — almacenamiento (Stub, TCP 3010)
    └── user-service/                     # NestJS microservice — usuarios (Stub, TCP 3009)
```

*(Cada servicio dentro de `services/` contiene su propio `src/`, `Dockerfile`, `package.json`, etc.)*

---

## 3. Servicios Implementados vs. Documentados

El documento [[06-microservicios-tradicionales]] define 9 servicios. En este esqueleto se implementaron todos como stubs NestJS para garantizar la coherencia arquitectónica:

| Servicio (doc 06) | Puerto | Estado en esqueleto | Notas |
|-------------------|--------|---------------------|-------|
| `auth-service` | 3008 | ⚡ Implementado (Stub) | Lógica delegada a AWS Cognito |
| `user-service` | 3009 | ✅ Implementado (Stub) | Fase futura |
| `catalog-service` | 3003 | ✅ Implementado | Estructura completa (Gateway + Servicio) |
| `inventory-service` | 3004 | ✅ Implementado (Stub) | Separado de catalog |
| `order-service` | 3005 | ✅ Implementado | Estructura completa (Gateway + Servicio) |
| `payment-service` | 3006 | ✅ Implementado (Stub) | Fase futura |
| `notification-service` | 3007 | ✅ Implementado (Stub) | Fase futura |
| `storage-service` | 3010 | ✅ Implementado (Stub) | Fase futura |
| `admin-service` | 3011 | ✅ Implementado (Stub) | Fase futura |

---

## 4. Flujo de Comunicación

```
Cliente HTTP
    │
    ▼ HTTPS (puerto 3000)
┌──────────────────────────────────────┐
│  gateway/                            │
│  NestJS HTTP Server                  │
│  Verifica JWT (AWS Cognito)          │
│                                      │
│  GET /catalog   → TCP → catalog/     │
│  GET /orders    → TCP → order/       │
│  POST /orders   → TCP → order/       │
└───────────────┬──────────────────────┘
                │ TCP
        ┌───────┴────────┐
        ▼                ▼
┌────────────────┐  ┌────────────────┐
│ catalog-service│  │ order-service  │
│ TCP :3003      │  │ TCP :3005      │
│ @MessageP.     │  │ @MessageP.     │
└────────────────┘  └────────────────┘
```

### Estado de Evolución de Comunicación (Paso A vs. Paso B)

* **Paso A: Microservicios Tradicionales (Comunicación Síncrona) — *Implementado en Código*:**
  La comunicación entre el API Gateway y los microservicios se realiza mediante **TCP directo** (`Transport.TCP` nativo de NestJS). Cada microservicio expone un puerto TCP específico (ej. `3003` para `catalog-service`, `3005` para `order-service`) y el Gateway enruta las peticiones de manera directa y síncrona.

* **Paso B: Microservicios Modernos (Orientados a Eventos) — *Preparado en Infraestructura*:**
  En el archivo [`docker-compose.yml`](../docker-compose.yml) ya se encuentra definido y aprovisionado el broker de mensajería **RabbitMQ** (`rabbitmq:3-management` en los puertos `5672` y `15672`). Sin embargo, los microservicios y el gateway **no están conectados aún en código** a este servicio (no se utiliza `Transport.RMQ`). Esto permitirá migrar en una fase posterior reemplazando el transporte sin modificar la lógica interna de los stubs de NestJS, demostrando acoplamiento laxo.

> [!info] Paso B pendiente
> La arquitectura Event-Driven con RabbitMQ corresponde al issue **#7**. Ver el futuro `07-microservicios-event-driven`.

---

## 5. Historial de Commits de esta Feature

Los siguientes commits fueron realizados en la rama `feature/nestjs-microservices-migration` (resumen de la reestructuración):

```txt
feat: align microservices structure with architectural documentation
feat: add NestJS stubs for all 9 microservices
refactor: rename products and orders to catalog and order-service
feat: update gateway routes and client proxies
```
