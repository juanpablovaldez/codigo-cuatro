---
title: "Fase 2A — Microservicios Tradicionales (REST Síncrono)"
tags: [fase-2, microservicios, rest, api-gateway, circuit-breaker, nestjs]
fase: 2
paso: A
issues: ["#5", "#6"]
estado: completo
relacionado:
  - "[[02-arquitectura-inicial]]"
  - "[[10-cache-alta-disponibilidad]]"
  - "[[00-reporte-esqueleto]]"
---

# Fase 2 - Paso A: Arquitectura de Microservicios Tradicionales (REST Síncrono)

## 1. Contexto: por qué el monolito ya no alcanza

El sistema arrancó como un monolito modular en NestJS. Esa decisión fue correcta para el MVP porque el volumen inicial era bajo: entre 5 y 20 comercios, hasta 500 clientes y hasta 100 pedidos diarios.

Sin embargo, el escenario de negocio cambió. La plataforma fue adoptada por comercios de mayor volumen y durante eventos de alta demanda (liquidaciones, fechas especiales, campañas de descuento) se empezaron a observar los siguientes problemas:

| Síntoma | Causa en el monolito |
|---------|----------------------|
| Lentitud en el checkout | El módulo de órdenes compite por el mismo pool de conexiones a PostgreSQL que el catálogo |
| Errores en stock (sobreventa) | Acceso concurrente no aislado: dos transacciones leen disponibilidad al mismo tiempo y ambas confirman |
| Deploy genera downtime total | Cualquier cambio obliga a redesplegar toda la API, generando 15-40 segundos de indisponibilidad |
| Equipo bloqueado | Seis desarrolladores sobre el mismo codebase generan conflictos frecuentes en archivos compartidos |
| Pagos frágiles (propagación de fallos) | Un timeout del proveedor externo degrada toda la API por falta de aislamiento entre módulos |
| Notificaciones inflaban la latencia del checkout | El email de confirmación se enviaba de forma síncrona dentro del mismo flujo del pedido, agregando ~1,6s |

El escenario concreto que fuerza la migración es el siguiente: la plataforma creció a **487 comercios activos**, **14.300 clientes registrados**, **38.000 productos publicados** y picos de **820 pedidos por hora** con **1.400 usuarios concurrentes** (~210 RPS). Esto representa aproximadamente 30x más usuarios concurrentes y 80x más pedidos en hora pico respecto al diseño del MVP. El módulo de catálogo requiere muchas más lecturas que el de órdenes, pero al estar en el mismo proceso no se pueden escalar de forma independiente.

Esta es la situación que justifica evolucionar hacia microservicios.

---

## 2. Criterios de descomposición

Para identificar los servicios se tomaron dos criterios:

1. **Dominio de negocio**: cada servicio tiene responsabilidad sobre un dominio acotado, con su propia lógica y sus propios datos. Ningún servicio accede directamente a la base de datos de otro.
2. **Necesidad de escalado independiente**: los dominios con perfiles de carga distintos (catálogo vs. órdenes vs. notificaciones) se separan para poder escalar cada uno según su demanda real.

---

## 3. Servicios definidos

| Servicio | Dominio | Responsabilidades | Puerto interno |
|----------|---------|-------------------|----------------|
| `auth-service` | Autenticación | Registro, login, emisión y validación de JWT, refresh tokens | 3008 |
| `user-service` | Usuarios y comercios | CRUD de clientes, vendedores, invitaciones, perfil, gestión de comercios | 3009 |
| `catalog-service` | Catálogo | Productos, categorías, búsqueda, FAQs, recursos de ayuda | 3003 |
| `inventory-service` | Stock | Disponibilidad, reservas, descuentos de stock, alertas de bajo stock | 3004 |
| `order-service` | Pedidos | Creación, ciclo de vida del pedido, historial, estados | 3005 |
| `payment-service` | Pagos | Integración con proveedor externo, confirmación, reversión | 3006 |
| `notification-service` | Notificaciones | Envío de emails y avisos por cambio de estado de pedidos y compras | 3007 |
| `storage-service` | Almacenamiento | Upload de imágenes de productos y recursos, integración con S3 | 3010 |
| `admin-service` | Administración | Supervisión de usuarios, comercios, pedidos y métricas de plataforma | 3011 |

Cada servicio es una aplicación NestJS independiente con su propia base de datos PostgreSQL. No comparten esquemas ni conexiones.

---

## 4. Diagrama de arquitectura

```
                         ┌─────────────────────────────────┐
                         │           CLIENTES               │
                         │  Cliente / Vendedor / Admin       │
                         │  web/ React 19 + Vite             │
                         └────────────────┬────────────────┘
                                          │ HTTPS
                                          ▼
                         ┌─────────────────────────────────┐
                         │          API GATEWAY             │
                         │  - Enrutamiento por prefijo      │
                         │  - Validación de JWT             │
                         │  - Rate limiting                 │
                         │  - Logging de requests           │
                         └──────┬──────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  auth-service    │  │  user-service    │  │  catalog-service │
│  :3008           │  │  :3009           │  │  :3003           │
│  JWT / Auth      │  │  Usuarios /      │  │  Productos /     │
│                  │  │  Comercios       │  │  Categorías      │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │  DB Auth │         │  DB User │         │ DB Catálog│
    └──────────┘         └──────────┘         └──────────┘

          │                     │                     │
          ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ inventory-service│  │  order-service   │  │ payment-service  │
│  :3004           │  │  :3005           │  │  :3006           │
│  Stock /         │  │  Pedidos /       │  │  Pagos /         │
│  Disponibilidad  │  │  Estado          │  │  Proveedor ext.  │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │  DB Inv  │         │  DB Ord  │         │  DB Pay  │
    └──────────┘         └──────────┘         └──────────┘

          │                     │                     │
          ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│notification-svc  │  │  storage-service │  │  admin-service   │
│  :3007           │  │  :3010           │  │  :3011           │
│  Emails / Avisos │  │  S3 / Archivos   │  │  Panel admin     │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │  DB Notif│         │  AWS S3  │         │  DB Admin│
    └──────────┘         └──────────┘         └──────────┘
```

---

## 5. Flujo de una compra (checkout)

Este es el flujo más crítico del sistema, ya que involucra a cinco servicios distintos en secuencia síncrona:

```
Cliente
  │
  │  POST /orders/checkout
  ▼
API Gateway
  │  valida JWT → auth-service
  │
  ▼
order-service
  │  GET /catalog/products/{id}       → catalog-service  [verificar producto]
  │  GET /inventory/availability/{id} → inventory-service [verificar stock]
  │  POST /inventory/reserve          → inventory-service [reservar unidades]
  │  POST /payments/process           → payment-service   [procesar pago]
  │    └─ Si falla → POST /inventory/release → inventory-service [liberar reserva]
  │  PATCH /inventory/confirm         → inventory-service [confirmar descuento]
  │  POST /notifications/send         → notification-service [avisar cliente/vendedor]
  │
  ▼
Respuesta al cliente: pedido confirmado o error
```

Si el pago falla, el `order-service` es responsable de liberar la reserva de stock antes de responder con error al cliente.

---

## 6. Comunicación entre servicios

Todos los servicios se comunican mediante **HTTP/REST síncrono**. Las llamadas internas usan la red privada del clúster (no pasan por el API Gateway).

### Reglas de comunicación

| Regla | Descripción |
|-------|-------------|
| Solo el API Gateway recibe tráfico externo | Los servicios internos no están expuestos públicamente |
| Las llamadas entre servicios usan DNS interno | Por ejemplo: `http://inventory-service:3004/availability` |
| Cada servicio valida permisos propios | No delegan autorización a otro servicio |
| Los servicios no acceden a la BD de otro | La única forma de acceder a datos de otro dominio es vía su API REST |

---

## 7. Patrón API Gateway

El API Gateway es el único punto de entrada al sistema. Sus responsabilidades son:

| Responsabilidad | Detalle |
|----------------|---------|
| Enrutamiento | `/auth/*` → auth-service, `/catalog/*` → catalog-service, etc. |
| Validación de JWT | Verifica el token antes de forwarding al servicio destino |
| Rate limiting | Límite de requests por IP para prevenir abuso |
| Logging centralizado | Registra todos los requests y sus tiempos de respuesta |
| CORS | Configuración centralizada de políticas de origen |

**Implementación propuesta**: AWS API Gateway o Kong Gateway (self-hosted).

---

## 8. Patrón Circuit Breaker

En arquitecturas síncronas, una llamada a un servicio caído puede generar un efecto cascada: el `order-service` espera respuesta del `payment-service`, que a su vez espera al proveedor externo, bloqueando hilos en toda la cadena.

El Circuit Breaker interrumpe este ciclo:

```
Estado CERRADO (normal):
  order-service → payment-service ✓ (responde OK)

Estado ABIERTO (servicio caído):
  order-service → Circuit Breaker → Respuesta rápida de error
  (no llama a payment-service, evita timeout)

Estado SEMI-ABIERTO (recuperación):
  Deja pasar una request de prueba
  Si responde OK → vuelve a CERRADO
  Si falla → vuelve a ABIERTO
```

Se aplica Circuit Breaker en las llamadas de `order-service` hacia `payment-service` e `inventory-service`, que son los de mayor riesgo en el flujo de checkout.

**Implementación propuesta**: biblioteca `opossum` para Node.js o configuración en el service mesh (Istio/Envoy si se usa K8s).

---

## 9. Base de datos por servicio

Cada servicio tiene su propia base de datos PostgreSQL. No hay una base de datos centralizada.

| Servicio | Base de datos | Tablas principales |
|----------|---------------|-------------------|
| auth-service | `db_auth` | `tokens`, `refresh_tokens`, `sessions` |
| user-service | `db_users` | `users`, `companies`, `invitations`, `roles` |
| catalog-service | `db_catalog` | `products`, `categories`, `faqs`, `resources` |
| inventory-service | `db_inventory` | `stock`, `reservations`, `stock_history` |
| order-service | `db_orders` | `orders`, `order_items`, `order_status_history` |
| payment-service | `db_payments` | `payments`, `payment_attempts`, `refunds` |
| notification-service | `db_notifications` | `notification_log`, `templates` |
| admin-service | `db_admin` | `audit_log`, `platform_metrics`, `config` |

**Consecuencia de esta decisión**: no hay JOINs entre bases de datos. Si el `order-service` necesita mostrar el nombre del producto en un pedido, debe llamar al `catalog-service` por REST o almacenar una copia desnormalizada del nombre al momento de crear el pedido (snapshot de datos).

---

## 10. Estrategia de datos desnormalizados (snapshot)

Para evitar llamadas en cadena en cada lectura, algunos servicios guardan una copia de datos de otros dominios en el momento de la operación. Esta copia queda congelada y no se actualiza si el original cambia.

| Dato | Dónde se guarda la copia | Por qué |
|------|--------------------------|---------|
| Nombre del producto | `order_items.product_name` | Evitar lookup al catalog-service en cada lectura de pedido |
| Precio al momento de compra | `order_items.unit_price` | El precio puede cambiar después, el pedido debe mantener el precio original |
| Nombre del comercio | `orders.company_name` | Evitar lookup al user-service al mostrar historial |

---

## 11. Comparación: monolito vs. microservicios REST

| Aspecto | Monolito (Fase 1) | Microservicios REST (Fase 2A) |
|---------|------------------|-------------------------------|
| Despliegue | Un solo deploy para todo | Deploy independiente por servicio |
| Escalado | Se escala toda la API | Se escala solo el servicio que lo necesita |
| Fallos | Un error puede afectar toda la API | El fallo está aislado al servicio que falla |
| Latencia | Llamadas en memoria (sub-ms) | Llamadas HTTP internas (1-5ms por hop) |
| Consistencia de datos | Transacciones ACID entre módulos | Consistencia eventual, sin JOIN entre BDs |
| Complejidad operativa | Baja | Alta (más procesos, más bases de datos) |
| Independencia de equipos | Baja (conflictos entre desarrolladores) | Alta (cada equipo dueño de su servicio) |
| Observabilidad | Un log centralizado | Requiere tracing distribuido (correlación de IDs) |

---

## 12. Limitaciones de esta arquitectura (Paso A)

Esta arquitectura resuelve el problema de escalado independiente, pero introduce nuevas limitaciones:

1. **Acoplamiento temporal**: el checkout es una cadena síncrona. Si el `payment-service` está lento, el `order-service` también se vuelve lento.
2. **Sin tolerancia a fallos en cascada sin Circuit Breaker**: si no se implementa explícitamente, una caída en un servicio aguas abajo bloquea los servicios que dependen de él.
3. **Consistencia débil**: al no poder usar transacciones distribuidas reales, si el servicio de notificaciones falla después de confirmar el pedido, el cliente no recibe el aviso. El pedido ya está confirmado.
4. **Complejidad operativa**: 9 servicios + 8 bases de datos significa mayor superficie de deploy, configuración y monitoreo.

Estas limitaciones son las que justifican evolucionar hacia una arquitectura event-driven en el **Paso B** de esta misma fase.

> [!success] Paso B — Completo
> La arquitectura Event-Driven con AWS SQS/SNS está documentada en [[07-microservicios-event-driven]]. Cubre CQRS, Saga por coreografía, Circuit Breaker en comunicación síncrona residual y consistencia eventual. Issue **#7** cerrado.

---

## 13. Conclusión

La migración a microservicios con comunicación REST síncrona permite al sistema de e-commerce multivendedor escalar cada dominio de forma independiente. El catálogo puede recibir decenas de miles de lecturas por día sin afectar al servicio de órdenes, y una caída en el servicio de pagos queda aislada gracias al Circuit Breaker.

Los patrones clave aplicados en esta arquitectura son:

- **API Gateway** como único punto de entrada y control.
- **Database per service** para asegurar autonomía real entre servicios.
- **Circuit Breaker** para proteger el flujo de checkout de fallos en cascada.
- **Data snapshot** en `order_items` para evitar dependencias de lectura en tiempo real entre dominios.

Sin embargo, la naturaleza síncrona de las llamadas introduce acoplamiento temporal entre servicios. Esa es la motivación para evolucionar hacia Event-Driven en el Paso B (ver issue #7).
