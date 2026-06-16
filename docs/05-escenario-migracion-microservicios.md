# Fase 2 — El Cambio de Contexto: Por Qué Evolucionamos

## 1. Introducción

La Fase 1 documentó deliberadamente los límites de la arquitectura monolítica elegida para el MVP. En ese momento, la decisión fue correcta: el volumen era bajo (entre 5 y 20 comercios, hasta 500 clientes, hasta 100 pedidos diarios) y el objetivo principal era validar el modelo de negocio con la menor complejidad operativa posible.

La documentación de la Fase 1 también advirtió con precisión cuáles serían los puntos de quiebre. Este documento describe el escenario concreto en el que esos puntos se materializaron, por qué el monolito dejó de ser suficiente y por qué la evolución hacia microservicios REST síncronos es la respuesta correcta para ese escenario específico.

La migración no se hace «porque sí». Se hace porque el negocio creció de una forma concreta que generó presiones concretas que la arquitectura anterior ya no puede absorber.

---

## 2. El Escenario Disparador

### 2.1 Crecimiento orgánico y eventos de alta demanda

Durante los primeros doce meses, la plataforma fue adoptada por comercios pequeños de barrio. El volumen era manejable y el monolito operaba sin inconvenientes.

El punto de inflexión ocurrió cuando se incorporaron **dos cadenas de comercios medianos** (una ferretería con 8 sucursales y una distribuidora de alimentos regionales con 12 puntos de venta). Estas incorporaciones multiplicaron el catálogo, el volumen de pedidos y los usuarios concurrentes en un período corto.

Simultáneamente, tres eventos intensificaron la carga de forma abrupta:

1. **Campaña de descuentos regional** coordinada entre vendedores (tipo "Cyber Monday local") durante 48 horas.
2. **Viralización en redes sociales** de una oferta de un comercio adherido, que concentró tráfico masivo sobre el catálogo en menos de 6 horas.
3. **Integración con un agregador de pagos** que comenzó a requerir webhooks síncronos por transacción, elevando la latencia de las operaciones de pago.

### 2.2 Estado del sistema al momento del quiebre

| Métrica | MVP inicial (Fase 1) | Escenario al quiebre |
|---------|---------------------:|---------------------:|
| Comercios activos | 5 a 20 | **487** |
| Clientes registrados | 100 a 500 | **14.300** |
| Productos publicados | 300 a 2.000 | **38.000** |
| Pedidos diarios (promedio) | 20 a 100 | **1.100** |
| Pedidos por hora (pico) | < 10 | **820** |
| Usuarios concurrentes (pico) | 10 a 50 | **1.400** |
| Requests por segundo (pico) | < 5 | **~210 RPS** |

Esto representa aproximadamente un **crecimiento de 30x en usuarios concurrentes** y de **80x en pedidos por hora en pico** respecto al escenario de diseño del MVP.

---

## 3. Los Cuellos de Botella Concretos del Monolito

Cada síntoma tiene una causa directa en las deudas técnicas documentadas en la Fase 1. No son problemas de código: son consecuencias estructurales predecibles de una arquitectura pensada para otro volumen.

### 3.1 El catálogo bloqueaba el checkout

**Síntoma:** El tiempo de respuesta del checkout subía de ~120ms a más de 4 segundos en pico. Los clientes abandonaban el carrito.

**Causa estructural:** El módulo de catálogo y el de pedidos comparten el mismo proceso y el mismo pool de conexiones a PostgreSQL. Durante la campaña, miles de clientes navegando el catálogo saturaban ese pool. El módulo de órdenes no encontraba conexiones disponibles para abrir sus transacciones y debía esperar en cola.

Escalar el monolito horizontalmente habría replicado toda la API, incluyendo el módulo de catálogo que ya tenía capacidad suficiente, en lugar de agregar instancias exclusivamente donde estaba la presión.

### 3.2 Un timeout de pagos propagó errores a toda la API

**Síntoma:** El integrador de pagos externo sufrió una degradación de 40 minutos. Durante ese período, **toda la API devolvía errores 500**, incluidos endpoints sin relación con pagos como búsqueda de productos o consulta de pedidos previos.

**Causa estructural:** El módulo de pagos realiza llamadas HTTP al proveedor externo sin mecanismo de circuit breaker ni timeout controlado a nivel de servicio. Cuando el proveedor respondía con demoras extremas, los recursos del proceso (conexiones, memoria de callbacks pendientes, colas de I/O) se acumulaban hasta degradar la capacidad de respuesta general de la API. Al no existir aislamiento entre módulos, la presión de un dominio se propagó a todos los demás.

Esto materializa el límite documentado en la Fase 1: *«Un error grave dentro de la API puede afectar varios módulos al mismo tiempo»*. Con un proceso aislado para pagos, una degradación del proveedor externo habría quedado contenida en el `payment-service`, y el catálogo, la autenticación y las consultas de pedidos habrían seguido operando con normalidad.

### 3.3 Los deploys generaban downtime total

**Síntoma:** Con el equipo creciendo de 2 a 6 desarrolladores, los deploys se volvieron más frecuentes. Cada uno generaba entre 15 y 40 segundos de indisponibilidad total.

**Causa estructural:** El monolito es una sola unidad de deploy. Cualquier cambio en cualquier módulo obliga a recompilar y redesplegar toda la API. Para una plataforma de e-commerce activa en horario comercial, el downtime es pérdida directa de ventas.

### 3.4 El stock presentó sobreventa por acceso concurrente no aislado

**Síntoma:** Durante la viralización de una oferta, el sistema confirmó 14 pedidos por encima del stock disponible. Los vendedores debieron cancelar pedidos manualmente.

**Causa estructural:** El módulo de inventario y el de pedidos accedían a las mismas tablas de PostgreSQL dentro de la misma base de datos compartida. Con alta concurrencia, dos transacciones podían leer disponibilidad simultáneamente, ver stock suficiente, y ambas confirmar el pedido antes de que alguna ejecutara el descuento. La verificación ocurría en la capa de aplicación, fuera de la transacción de base de datos, haciendo ineficiente el uso de locks a nivel de fila.

Un servicio de inventario aislado centraliza el control de concurrencia en un único proceso y base de datos propios, sin interferencia de otros módulos.

### 3.5 Las notificaciones síncronas inflaban la latencia del checkout

**Síntoma:** El checkout tardaba hasta 2,8 segundos, de los cuales ~1,6s correspondían al envío de emails de confirmación al cliente y al vendedor.

**Causa estructural:** El módulo de notificaciones vive en el mismo proceso que el de pedidos. La respuesta al cliente quedaba retenida hasta que se completara el envío del email. El usuario esperaba el resultado del email además de la confirmación del pedido.

En la arquitectura de microservicios REST de esta fase, el `order-service` confirma el pedido y delega el procesamiento de notificaciones al `notification-service` mediante una llamada HTTP directa al finalizar el flujo crítico. Como mejora posterior (Fase 2B), ese paso puede modelarse de forma asíncrona mediante un message broker, eliminando por completo el impacto de las notificaciones sobre la latencia del checkout.

### 3.6 El equipo generaba conflictos frecuentes en el codebase único

**Síntoma:** Con 6 desarrolladores sobre el mismo codebase, los Pull Requests generaban conflictos en archivos compartidos. Un cambio en el middleware de autorización rompió módulos que no estaban siendo modificados.

**Causa estructural:** El monolito no tiene fronteras físicas entre dominios. Los módulos comparten el mismo proceso, las mismas dependencias, la misma configuración y la misma base de datos. Un desarrollador del módulo de catálogo podía inadvertidamente romper el de pedidos.

El repositorio sigue siendo un **monorepo con la carpeta `services/`**, lo que permite mantener centralizado el historial y la coordinación del equipo. La independencia se establece por servicio dentro del monorepo: cada servicio tiene su propia base de datos, su propia configuración de entorno, su propio Dockerfile y su propio pipeline de despliegue. El ownership por dominio (quién puede hacer merge en qué carpeta) se define a nivel de reglas del repositorio, sin necesidad de separar repositorios físicos.

---

## 4. Métricas que el Monolito ya No Puede Cumplir

| SLA requerido | Objetivo | Con el monolito | ¿Se cumple? |
|---|---|---|---|
| Disponibilidad mensual | 99,5% (≤ 3,6 hs downtime) | ~98,1% por deploys + incidentes de terceros | ❌ No |
| Latencia checkout (p95) | < 800ms | ~2.800ms en pico | ❌ No |
| Latencia búsqueda catálogo (p95) | < 400ms | ~1.200ms en pico | ❌ No |
| Throughput sostenido | 200 RPS sin degradación | Degradación desde ~80 RPS | ❌ No |
| Deploy sin downtime | Blue/green, cero corte | 15 a 40 seg de indisponibilidad | ❌ No |
| Aislamiento de fallos | Pagos no afecta catálogo | Afecta toda la API | ❌ No |
| Escalado selectivo | Escalar catálogo sin escalar pedidos | Imposible con una sola unidad | ❌ No |

---

## 5. Nuevos Requerimientos del Negocio

| Requerimiento | Descripción |
|---|---|
| **Escalado independiente por dominio** | El catálogo recibe 10-20x más lecturas que pedidos. Escalar toda la API para aliviar el catálogo es ineficiente en costos. |
| **Deploys frecuentes sin downtime** | El equipo necesita desplegar correcciones por dominio varias veces por semana sin ventanas de mantenimiento visibles. |
| **Squads autónomos por dominio** | Catálogo/inventario, pedidos/pagos y plataforma (auth, usuarios, admin) deben poder desplegar y escalar sin bloquear a los otros. |
| **Aislamiento de fallos de terceros** | Un proveedor de pagos o email degradado no puede propagarse al catálogo ni a la autenticación. |
| **SLAs diferenciados** | El catálogo necesita alta disponibilidad de lectura. El checkout necesita baja latencia. Las notificaciones pueden tolerar mayor retraso. Una unidad única no permite políticas diferenciadas. |

---

## 6. Por Qué los Microservicios REST Resuelven Estos Problemas

La Fase 2 adopta una **arquitectura de microservicios con comunicación HTTP/REST síncrona** como primera evolución. Cada servicio tiene su propio proceso, su propia base de datos PostgreSQL y su propio ciclo de deploy dentro del monorepo.

| Problema del monolito | Solución en microservicios REST |
|---|---|
| Catálogo y checkout compiten por el mismo pool de conexiones | Pools de conexión separados por servicio. `catalog-service` y `order-service` no comparten recursos. |
| Timeout de pagos propaga errores a toda la API | `payment-service` aislado. Circuit Breaker en `order-service` detecta la degradación y responde rápido sin propagar el fallo. |
| Deploy genera downtime total | Cada servicio se despliega de forma independiente. Un deploy en `notification-service` no afecta a `catalog-service`. |
| Sobreventa por acceso concurrente no aislado | `inventory-service` es el único dueño del stock. Control de concurrencia centralizado en un único proceso y base de datos. |
| Notificaciones añaden latencia al checkout | `order-service` llama a `notification-service` al final del flujo principal por REST. En Fase 2B, ese paso puede derivarse a un broker para procesamiento diferible y asíncrono. |
| Equipo bloqueado por codebase único | Ownership por carpeta de servicio dentro del monorepo. Cada squad controla su configuración, base de datos y pipeline. |
| Imposible escalar solo el catálogo | `catalog-service` puede tener 5 réplicas mientras `payment-service` tiene 1. Costos ajustados a la demanda real. |

---

## 7. Tabla Comparativa: Monolito vs. Microservicios REST

| Aspecto | Monolito modular Express (Fase 1) | Microservicios REST (Fase 2) |
|---|---|---|
| **Unidad de deploy** | Toda la API completa | Servicio individual por dominio |
| **Unidad de escalado** | Toda la API completa | Solo el servicio con demanda |
| **Aislamiento de fallos** | Un fallo puede propagarse a todos los módulos | El fallo queda contenido en el servicio afectado |
| **Latencia de llamadas internas** | Sub-milisegundo (en memoria) | 1 a 5ms por hop HTTP |
| **Consistencia de datos** | Transacciones ACID en una sola BD | Consistencia eventual; cada servicio tiene su propia BD |
| **Disponibilidad en deploys** | Downtime total durante el deploy | Deploy independiente sin corte de otros servicios |
| **Pool de conexiones a BD** | Compartido entre todos los módulos | Aislado por servicio |
| **Ownership del equipo** | Todos editan el mismo codebase | Cada squad es responsable de su carpeta de servicio |
| **Complejidad operativa** | Baja (un proceso, un log, un deploy) | Alta (N servicios, tracing distribuido, más configuración) |
| **Escalado selectivo** | Imposible (todo o nada) | Posible (réplicas ajustadas por servicio) |
| **Fallo de proveedor externo** | Afecta toda la API | Afecta solo el servicio que consume ese proveedor |
| **Throughput sin degradación** | ~80 RPS (observado) | Objetivo: > 200 RPS con escalado selectivo |
| **Latencia checkout p95** | ~2.800ms en pico | Objetivo: < 800ms |
| **Costo de infraestructura** | Ineficiente (réplicas de todo para aliviar una parte) | Eficiente (escalar solo lo que tiene demanda real) |

---

## 8. Conclusión

El escenario que fuerza la migración es concreto, cuantificable y directamente ligado a las deudas técnicas que la Fase 1 documentó desde el inicio.

La plataforma pasó de 20 comercios a 487, de 100 pedidos diarios a 1.100 y de 10 usuarios concurrentes a 1.400 en pico. Esos números materializaron exactamente los puntos de quiebre previstos: el catálogo bloqueó el checkout, un proveedor externo propagó errores a toda la API por falta de aislamiento, los deploys generaron downtime y el stock presentó sobreventa por acceso concurrente no controlado.

La respuesta no es agregar más recursos al monolito. El problema es arquitectónico: una sola unidad de proceso y base de datos impide escalar dominios de forma selectiva, aislar fallos entre módulos y habilitar equipos autónomos por dominio.

La evolución adoptada en esta fase es la **arquitectura de microservicios con comunicación REST síncrona**, manteniendo el repositorio como monorepo con independencia real por servicio (proceso propio, base de datos propia, deploy propio). Los trade-offs que introduce esta arquitectura (consistencia eventual, latencia de red interna, mayor complejidad operativa) son manejables y claramente menores que los problemas que resuelve.

Los problemas que la comunicación síncrona no elimina completamente —el acoplamiento temporal entre servicios en el checkout y la posibilidad de que notificaciones fallen después de confirmar un pedido— quedan como motivación documentada para la evolución hacia una arquitectura orientada a eventos en la Fase 2B.
