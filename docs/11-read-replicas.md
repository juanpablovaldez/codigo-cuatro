---
title: "Fase 3 — Estrategia de Replicación de Base de Datos"
tags: [fase-3, read-replicas, postgresql, alta-disponibilidad, escalabilidad, failover]
fase: 3
issues: ["#11"]
estado: completo
relacionado:
  - "[[06-microservicios-tradicionales]]"
  - "[[10-cache-alta-disponibilidad]]"
---

# Fase 3 – Estrategia de Replicación de Base de Datos

## 1. Contexto

La arquitectura de microservicios definida en la Fase 2 separa el sistema en servicios independientes, cada uno con su propia base de datos PostgreSQL. Esta decisión evita acoplamiento directo entre dominios y permite escalar cada módulo según su perfil de carga.

Sin embargo, a medida que la plataforma crece, algunos servicios reciben muchas más lecturas que escrituras. En especial, el `catalog-service`, el `user-service`, el `inventory-service` y el `admin-service` pueden recibir consultas constantes desde clientes, vendedores y administradores.

El escenario de crecimiento definido para el sistema contempla:

| Métrica                         | Estimación |
|--------------------------------|------------|
| Comercios activos              | **487**    |
| Clientes registrados           | **14 300** |
| Productos publicados           | **38 000** |
| Usuarios concurrentes          | **1 400**  |
| Pedidos en hora pico           | **820/h**  |
| Carga estimada total           | **≈ 210 RPS** |

Bajo este escenario, usar una única instancia de base de datos por servicio genera un riesgo: las lecturas frecuentes pueden competir con las escrituras críticas, aumentando la latencia y afectando la disponibilidad del sistema.

Para resolverlo, se diseña una estrategia de **replicación con Read Replicas**.

## 2. Objetivo de la replicación

El objetivo de la replicación es separar la carga de lectura y escritura para mejorar el rendimiento, la disponibilidad, la tolerancia a fallos y la escalabilidad horizontal de consultas. La idea central es que cada base crítica tenga:

* Una instancia primaria para escrituras.
* Una o más réplicas para lecturas.
* Failover automático o semi‑automático.
* Monitoreo del lag de replicación.

## 3. Decisión arquitectónica

Se adopta la topología **Primary único + N Read Replicas**:

```text
1 Primary DB por servicio crítico
+
1 a 3 réplicas de lectura, según carga
+
Multi‑AZ para alta disponibilidad
```

No se adopta una arquitectura Multi‑Master porque el sistema requiere consistencia fuerte en dominios como stock, pedidos y pagos. Permitir múltiples nodos escribiendo al mismo tiempo aumentaría la complejidad de resolución de conflictos y podría generar inconsistencias operativas.

## 4. Topología general

Cada microservicio mantiene su propia base de datos. La replicación se aplica únicamente donde existe una necesidad real de lectura intensiva o alta disponibilidad.

```text
                         API Gateway
                              │
        ┌──────────────────────┼───────────────────────┐
        ▼                      ▼                       ▼
   catalog‑svc           inventory‑svc             order‑svc
        │                      │                       │
        │  escrituras          │  escrituras           │  escrituras
        ▼                      ▼                       ▼
    db_catalog            db_inventory             db_orders
    Primary Writer        Primary Writer          Primary Writer
        │                      │                       │
        │  replicación         │  replicación          │  replicación
        ▼                      ▼                       ▼
    catalog‑replica‑1     inventory‑replica      orders‑replica‑1
    catalog‑replica‑2

       user‑svc              admin‑svc
        │                      │
        │  escrituras          │  escrituras
        ▼                      ▼
    db_users               db_admin
    Primary Writer         Primary Writer
        │                      │
        ▼                      ▼
    users‑replica‑1        admin‑replica‑1
```

## 5. Cantidad de réplicas por servicio

No todos los servicios necesitan la misma cantidad de réplicas. La cantidad se define según el ratio lectura/escritura, criticidad y volumen esperado.

| Servicio            | Perfil de carga               | Réplicas iniciales | Justificación resumida                                             |
|---------------------|-------------------------------|--------------------|--------------------------------------------------------------------|
| `catalog-service`   | Alta lectura / baja escritura | 2                  | Recibe muchas consultas de productos, categorías y filtros.         |
| `inventory-service` | Alta lectura / alta escritura | 1                  | Hay muchas consultas pero las escrituras de reserva requieren consistencia. |
| `order-service`     | Lectura media / escritura crítica | 1               | Historial y consultas pueden ir a réplica; las escrituras son críticas. |
| `user-service`      | Lectura alta / escritura baja | 1                  | Datos de usuario se consultan seguido y cambian poco.              |
| `admin-service`     | Lectura analítica / escritura baja | 1             | Dashboards y métricas pueden leer desde réplica.                  |
| `payment-service`   | Escritura crítica / lectura baja | 0 inicial         | Los pagos requieren consistencia fuerte; no se replica inicialmente. |
| `notification-service` | Escritura de logs / lectura baja | 0               | Se replica sólo si hay muchas consultas administrativas.          |
| `auth-service`      | Lectura alta mitigada por caché/JWT | 0 o 1          | Si se delega autenticación externa, la base pierde criticidad.     |
| `storage-service`   | Metadatos en S3 / lectura baja | 0                  | Sólo se replica si hay muchas consultas de metadatos.              |

Cantidad inicial recomendada:

```text
db_catalog:      1 primary + 2 réplicas
db_inventory:    1 primary + 1 réplica
db_orders:       1 primary + 1 réplica
db_users:        1 primary + 1 réplica
db_admin:        1 primary + 1 réplica
```

## 6. Enrutamiento de queries

### Principio general

* Todas las escrituras van al Primary.
* Todas las lecturas tolerantes a consistencia eventual van a una réplica.
* Las lecturas que requieren consistencia fuerte van al Primary.

### Lecturas que van al Primary

| Servicio            | Operación clave                 | Motivo resumido                                                                 |
|---------------------|---------------------------------|----------------------------------------------------------------------------------|
| `inventory-service` | Reservar, confirmar o liberar stock | Debe evitar sobreventa; requiere consistencia fuerte.                            |
| `order-service`     | Crear pedido o cambiar estado   | Son operaciones transaccionales críticas.                                        |
| `payment-service`   | Registrar pago                  | Operación financiera crítica.                                                    |
| `user-service`      | Crear o editar usuario          | Escritura de datos maestros.                                                     |
| `catalog-service`   | Crear, editar o eliminar producto | Cambia la información pública visible.                                           |
| `admin-service`     | Registrar auditoría             | Debe persistirse sin pérdida.                                                    |

### Lecturas que pueden ir a réplica

| Servicio            | Operación                            | Motivo resumido                                         |
|---------------------|--------------------------------------|---------------------------------------------------------|
| `catalog-service`   | Listados de productos, búsqueda y filtros | Lecturas masivas que toleran unos segundos de retraso. |
| `user-service`      | Perfil público del comercio          | Cambios poco frecuentes.                                 |
| `order-service`     | Historial de pedidos antiguos        | Toleran demoras leves.                                   |
| `admin-service`     | Dashboards y reportes                | Naturaleza analítica tolerante a datos atrasados.         |

### Lecturas críticas que deben ir al Primary

| Servicio            | Lectura crítica                          | Motivo resumido                             |
|---------------------|-----------------------------------------|---------------------------------------------|
| `inventory-service` | Verificar stock en checkout             | Si lee dato viejo, puede vender sin stock. |
| `order-service`     | Consultar pedido recién creado          | El cliente espera ver su pedido al instante.|
| `payment-service`   | Consultar estado de pago recién procesado | Necesita consistencia fuerte inmediata.     |
| `catalog-service`   | Validar precio al confirmar compra       | Debe usar precio actualizado o snapshot.    |

### Patrón de implementación en microservicios

Cada microservicio que use base de datos debe manejar dos conexiones:

```env
DATABASE_WRITE_URL → Primary
DATABASE_READ_URL  → Read Replica
```

En la capa de datos se separan explícitamente:

```text
ReadRepository  → consultas de lectura (réplicas)
WriteRepository → comandos y transacciones (primary)
```

Ejemplos de decisiones:

```text
ProductReadRepository.findMany()        → Read Replica
ProductWriteRepository.updateProduct()  → Primary
OrderReadRepository.getHistory()        → Read Replica
OrderWriteRepository.createOrder()      → Primary
InventoryWriteRepository.reserveStock() → Primary
```

Esta separación evita que los controladores decidan a qué base conectarse; la decisión reside en los repositorios.

## 7. Lag de replicación

El lag es el tiempo que tarda una escritura realizada en el Primary en aparecer en una Read Replica. Normalmente varía de milisegundos a unos segundos. Bajo alta carga o problemas de red puede aumentar.

### Riesgos del lag

* Producto editado y el cliente consulta una réplica desactualizada → puede ver un precio anterior.
* Stock actualizado y lectura desde réplica atrasada → puede mostrar stock incorrecto.
* Pedido recién creado y lectura en réplica atrasada → el cliente puede no ver su pedido.
* Dashboards en admin → pueden mostrar métricas atrasadas.

### Decisiones según datos

| Dato                               | Consistencia necesaria | Fuente de lectura |
|------------------------------------|------------------------|-------------------|
| Stock en checkout                  | Fuerte                | Primary           |
| Confirmación de pago               | Fuerte                | Primary           |
| Creación de pedido                 | Fuerte                | Primary           |
| Listados de catálogo               | Eventual              | Read Replica      |
| Búsqueda de catálogo               | Eventual              | Read Replica      |
| Historial de pedidos antiguos      | Eventual              | Read Replica      |
| Dashboards administrativos         | Eventual              | Read Replica      |
| Perfil público de comercio         | Eventual              | Read Replica      |

### Manejo del lag

1. Las lecturas inmediatamente posteriores a una escritura crítica se hacen contra el Primary.
2. Las queries de checkout no leen desde réplicas si afectan stock o precio.
3. Los dashboards y reportes aceptan consistencia eventual.
4. Se monitorea el lag por réplica; si una réplica supera el umbral permitido, se retira del pool de lectura.

Umbrales sugeridos:

| Servicio            | Lag máximo tolerable |
|---------------------|----------------------|
| `catalog-service`   | 5 s                 |
| `user-service`      | 10 s                |
| `order-service`     | 3 s                 |
| `inventory-service` | 1 s                 |
| `admin-service`     | 30 s                |

## 8. Failover

El failover es el proceso por el cual el sistema recupera disponibilidad si cae la base primaria. Se adopta una estrategia de failover automático administrado, por ejemplo mediante Amazon RDS Multi‑AZ.

### Flujo de failover

```text
Primary DB falla
  │
  ▼
Health check detecta caída
  │
  ▼
El proveedor promueve una réplica a Primary
  │
  ▼
DNS / endpoint apunta al nuevo Primary
  │
  ▼
Microservicios reconectan automáticamente
  │
  ▼
El sistema vuelve a operar
```

### Comportamiento esperado

| Evento                | Respuesta del sistema                                                |
|-----------------------|-----------------------------------------------------------------------|
| Cae una Read Replica  | Se retira del pool y el servicio usa otra réplica o el Primary.       |
| Cae el Primary        | Se promueve una réplica a nuevo Primary.                              |
| Cae una zona de disponibilidad | Multi‑AZ mantiene una réplica en otra zona.                    |
| Réplica con lag alto  | Se marca como no saludable y no se envían lecturas hacia ella.        |
| Error de conexión temporal | Se realizan reintentos con backoff exponencial.                 |

El objetivo es que el failover sea automático para ambientes de producción y semi‑automático en ambientes no productivos.

## 9. Integración con microservicios

### `catalog-service`

* Lecturas desde réplicas: listado, búsqueda, filtros, detalle público.
* Escrituras al primary: crear, editar y eliminar productos; actualización de categorías.

### `inventory-service`

* Lecturas desde réplicas: consultas generales fuera del checkout, reportes de stock.
* Lecturas al primary: disponibilidad en checkout y validación previa a reserva.
* Escrituras al primary: reservar, confirmar y liberar stock.

### `order-service`

* Lecturas desde réplicas: historial de pedidos y consultas administrativas.
* Lecturas al primary: pedido recién creado y cambios de estado.
* Escrituras al primary: crear, cancelar y confirmar pedidos.

### `user-service`

* Lecturas desde réplicas: perfil público, datos del vendedor y configuraciones.
* Escrituras al primary: registro, edición de perfil, aprobación de comercio y cambios de rol.

### `admin-service`

* Lecturas desde réplicas: dashboards, métricas, reportes y auditoría histórica.
* Escrituras al primary: configuración global, acciones administrativas y registros de auditoría.

### `payment-service`

No usa read replica inicialmente. Todas las operaciones de pago van al Primary. En una fase futura se puede agregar réplica sólo para reportes financieros o conciliaciones históricas.

## 10. Sharding horizontal

El sharding consiste en dividir una base de datos horizontalmente. En esta fase no se recomienda aplicar sharding de forma general.

| Servicio            | ¿Aplica sharding? | Justificación resumida                                          |
|---------------------|-------------------|------------------------------------------------------------------|
| `catalog-service`   | No                | 38 000 productos es manejable con índices, caché y réplicas.      |
| `order-service`     | No                | 820 pedidos/hora no justifican sharding todavía.                  |
| `inventory-service` | No                | El stock requiere consistencia fuerte; el sharding complica eso.  |
| `user-service`      | No                | 14 300 clientes es volumen bajo/medio para PostgreSQL.           |
| `admin-service`     | No                | Las lecturas analíticas se resuelven con réplicas.                |
| `notification-service` | Posible a futuro | Si los logs crecen mucho, se puede particionar por fecha.         |

Para prepararse a futuro se pueden particionar tablas grandes (por ejemplo, `orders` y `notification_log`) por fecha, indexar campos de búsqueda y evaluar sharding sólo si se supera un umbral de millones de registros.

Umbrales sugeridos:

| Tabla              | Umbral sugerido         |
|--------------------|-------------------------|
| `orders`           | > 10 millones de pedidos |
| `order_items`      | > 50 millones de registros |
| `notification_log` | > 100 millones de eventos |
| `products`         | > 5 millones de productos |
| `stock_history`    | > 100 millones de movimientos |

## 11. Diagrama final de topología master‑replica

```text
                                  API Gateway
                                     │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
   catalog‑svc                    inventory‑svc                   order‑svc
       │ writes                       │ writes                     │ writes
       ▼                              ▼                            ▼
 db_catalog_primary             db_inventory_primary           db_orders_primary
  Escrituras                     Escrituras                     Escrituras
       │                              │                            │
       └───replicación                └───replicación             └───replicación
               ▼                              ▼                            ▼
       db_catalog_rep_1            db_inventory_rep_1          db_orders_rep_1
       db_catalog_rep_2

   user‑svc                        admin‑svc
       │ writes                       │ writes
       ▼                              ▼
 db_users_primary               db_admin_primary
       │                              │
       ▼                              ▼
 db_users_rep_1                 db_admin_rep_1
```

## 12. Relación con la estrategia de caché

La replicación no reemplaza a la caché; se complementan:

| Mecanismo       | Problema que resuelve                              |
|-----------------|---------------------------------------------------|
| Redis (caché)   | Evita consultar la base para lecturas repetidas.   |
| Read Replicas   | Distribuyen lecturas cuando la base debe consultarse. |
| Primary DB      | Mantiene consistencia en operaciones críticas.     |
| Multi‑AZ        | Mantiene disponibilidad ante fallos.               |

Flujo de lectura del catálogo:

```text
Cliente → catalog-service
  │
  ├── Busca en Redis
  │       ├── HIT  → Responde desde caché
  │       └── MISS → Consulta Read Replica
  │
  └→ Guarda resultado en Redis
```

Flujo para operación crítica de stock:

```text
Cliente (checkout) → order-service → inventory-service
  │
  ├→ Lee stock en Primary
  ├→ Reserva stock en Primary
  └→ Continúa con el flujo de pago
```

## 13. Riesgos y mitigaciones

| Riesgo                           | Impacto                        | Mitigación                                                    |
|---------------------------------|--------------------------------|---------------------------------------------------------------|
| Lag de réplica                  | Datos levemente desactualizados | Leer desde Primary cuando sea crítico; monitorear el lag.     |
| Caída de una réplica            | Menor capacidad de lectura      | Retirar réplica del pool; redirigir tráfico al Primary.       |
| Caída del Primary               | Indisponibilidad de escrituras  | Failover automático Multi‑AZ.                                 |
| Lectura de stock viejo          | Sobreventa                      | Consultar stock de checkout siempre en Primary.               |
| Sobrecarga del Primary tras failover | Latencia elevada             | Auto‑escalado de réplicas y circuit breaker en servicios.     |
| Complejidad de routing          | Bugs en acceso a datos          | Separar `ReadRepository` y `WriteRepository`.                 |


La estrategia **Single Primary + Read Replicas** por servicio crítico mantiene consistencia fuerte en operaciones sensibles (stock, pedidos, pagos) y permite escalar lecturas frecuentes (catálogo, perfiles, historial y dashboards). Se evitan los conflictos de un esquema Multi‑Master y se incorpora el soporte de alta disponibilidad y failover automático. Además:

* Se justifica la cantidad de réplicas inicial por servicio.
* Se define el enrutamiento de queries para lecturas y escrituras.
* Se analiza el lag, se dan umbrales y cómo manejar réplicas lentas.
* Se diseña el failover con Multi‑AZ y comportamiento esperado.
* Se documenta cómo integrar las réplicas en cada microservicio.
* Se evalúa el sharding y se pospone para volúmenes futuros.
* Se incluye un diagrama final con la topología master‑replica.


