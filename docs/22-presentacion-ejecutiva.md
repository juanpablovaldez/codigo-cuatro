# Código Cuatro — Presentación Ejecutiva (10 minutos)

**Entregable 2 — [Issue #22](https://github.com/juanpablovaldez/codigo-cuatro/issues/22)**
Defensa oral ante Comité de Arquitectura · UNSTA · Desarrollo de Aplicaciones Web · 2026

---

## Guía de uso

Cada sección corresponde a un slide. El bloque **Notas del orador** no se proyecta — es la guía de presentación verbal. Los tiempos son aproximados para 10 minutos totales.

---

## Slide 1 — Portada `(0:00 – 0:30)`

### Código Cuatro
#### Plataforma E-commerce Multivendedor
**Evolución de Arquitectura: de Monolito a Microservicios Event-Driven**

---

Nacho Mignone · UNSTA · Desarrollo de Aplicaciones Web · 2026
github.com/juanpablovaldez/codigo-cuatro

> **Notas del orador:** Arrancar con calma. Dar 5 segundos en silencio para que el slide se asiente. Luego: "Voy a contarles cómo diseñamos un sistema que empezó atendiendo 50 usuarios concurrentes y terminó soportando 1.400 sin caerse."

---

## Slide 2 — El Problema de Negocio `(0:30 – 1:30)`

### El problema que resolvemos

- Pequeños y medianos comercios gestionan ventas por **WhatsApp, Instagram y planillas de Excel**
- Resultado: sin trazabilidad de pedidos, sin control de stock en tiempo real, sin datos para decidir
- **Solución:** plataforma centralizada multivendedor — un único lugar para gestionar productos, stock, pedidos y pagos

**3 actores del sistema:**

| Actor | Rol |
|---|---|
| **Cliente** | Busca productos y realiza pedidos online |
| **Vendedor** | Administra catálogo, stock y órdenes de su comercio |
| **Administrador** | Supervisa la plataforma, gestiona vendedores y resuelve disputas |

**Métricas del MVP (punto de partida):**
5-20 comercios · 100-500 clientes · 10-50 usuarios concurrentes · 20-100 pedidos/día

> **Notas del orador:** "Estos comercios compiten con Mercado Libre pero con hojas de Excel. El problema no es tecnológico — es de herramienta. Nuestra tarea fue construir la herramienta correcta para la escala correcta."

---

## Slide 3 — Fase 1: Arquitectura Inicial `(1:30 – 3:00)`

### Fase 1 — Monolito modular: la decisión correcta para el inicio

- **Backend:** NestJS con 14 módulos (auth, catalog, inventory, orders, payments, notifications…)
- **Frontend:** React 19 + Vite
- **Base de datos:** PostgreSQL 16
- **Costo inicial:** ~$120-180/mes

**Stack completo:**

| Capa | Tecnología |
|---|---|
| Frontend (SPA) | React 19 + Vite · TanStack Router + Query · Zustand · shadcn/ui + Tailwind CSS |
| Backend (API) | NestJS 11 · Controllers → Services → Prisma ORM |
| Persistencia | PostgreSQL 16 (único) |
| Infraestructura | Terraform + Amazon RDS + Amazon Cognito (identity) |

**Por qué elegimos monolito al inicio:**

| Criterio | Decisión |
|---|---|
| Escala objetivo (MVP) | < 500 clientes, 50 concurrentes → distribuir es overhead sin beneficio |
| Velocidad de desarrollo | Un único deploy, sin latencia de red entre módulos |
| Consistencia de datos | PostgreSQL único garantiza ACID en órdenes, pagos y stock concurrentes |
| Límite explícito documentado | **A 100x de carga, el monolito falla** — sabíamos cuándo migramos |

```
┌────────────────────────────────────────────┐
│         Frontend — React 19 + Vite         │
│    TanStack Router/Query · Zustand · UI    │
└─────────────────────┬──────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼──────────────────────┐
│              NestJS Monolito               │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐  │
│  │  Auth   │ │Catalog  │ │  Inventory  │  │
│  └─────────┘ └─────────┘ └─────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐  │
│  │ Orders  │ │Payments │ │Notifications│  │
│  └─────────┘ └─────────┘ └─────────────┘  │
│              Prisma ORM                    │
│           PostgreSQL 16 (compartido)       │
└────────────────────────────────────────────┘
```

> **Notas del orador:** La clave es que el monolito fue una **decisión consciente**, no ignorancia. Teníamos documentado el límite de escala desde el día uno. Cuando lo alcanzamos, sabíamos exactamente qué hacer.

---

## Slide 4 — El Quiebre: Métricas `(3:00 – 4:00)`

### Cuando el negocio superó al sistema

Una campaña de descuentos regional combinada con viralidad en redes generó un pico de tráfico inesperado que el monolito no pudo absorber.

| Métrica | MVP proyectado | Real al momento del quiebre |
|---|---|---|
| Comercios activos | 5-20 | **487** |
| Clientes registrados | 100-500 | **14.300** |
| Usuarios concurrentes | 10-50 | **1.400 (×30)** |
| Pedidos/hora en pico | 10-20 | **820 (~210 RPS) (×80)** |

**SLAs incumplidos:**
- Disponibilidad: **98.1%** (meta: 99.5%)
- Tiempo de respuesta checkout: **2.8 segundos** (meta: < 800ms)

> **Notas del orador:** "30 veces más usuarios concurrentes. 80 veces más pedidos por hora. El sistema no falló por mal diseño — falló porque el negocio creció más rápido de lo esperado. La arquitectura necesitaba evolucionar."

---

## Slide 5 — El Quiebre: Los 6 Bottlenecks `(4:00 – 4:30)`

### 6 cuellos de botella que bloquearon el crecimiento

| # | Bottleneck | Impacto |
|---|---|---|
| 1 | **Catalog bloqueaba Checkout** | Pool de conexiones compartido: consultas de catálogo competían con transacciones de órdenes |
| 2 | **Timeout de pagos en cascada** | Un timeout del proveedor externo degradaba todo el sistema |
| 3 | **Deploys con downtime** | Cada nueva feature requería 15-40 segundos de indisponibilidad total |
| 4 | **Oversale de stock** | Sin control de concurrencia granular, se vendía más unidades de las disponibles |
| 5 | **Notificaciones bloqueantes** | Enviar emails añadía 1.6 segundos al flujo de checkout del usuario |
| 6 | **Conflictos de equipo** | Un único codebase → merges conflictivos, coupling entre dominios |

> **Notas del orador:** "Cada uno de estos problemas tiene su solución específica en la arquitectura que vienen. No resolvimos en general: resolvimos cada bottleneck con el patrón correcto."

---

## Slide 6 — Fase 2A: Microservicios REST `(4:30 – 5:30)`

### Fase 2A — 9 microservicios independientes (REST síncrono)

**Principio de diseño:** cada dominio de negocio es un servicio autónomo con su propia base de datos.

- **API Gateway:** único punto de entrada — valida JWT, enruta, aplica rate limiting
- **9 servicios:** auth · user · catalog · inventory · order · payment · notification · storage · admin
- **Database-per-service:** cada servicio tiene su PostgreSQL — sin pool compartido
- **Circuit Breaker** en llamadas a proveedores externos (payment gateway, S3)
- **Dato desnormalizado en órdenes:** snapshot de precio y producto al momento de la compra

```
                    ┌──────────────┐
    Cliente ──────► │  API Gateway │
                    └──────┬───────┘
                           │ enruta por dominio
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌───────────┐    ┌───────────────┐   ┌─────────────┐
  │auth-svc   │    │  order-svc    │   │catalog-svc  │
  │[DB_Auth]  │    │  [DB_Orders]  │   │[DB_Catalog] │
  └───────────┘    └───────┬───────┘   └─────────────┘
                           │ REST síncrono
               ┌───────────┼───────────┐
               ▼           ▼           ▼
         inventory      payment   notification
         [DB_Inv]       [DB_Pay]  [DB_Notif]
```

**Resuelve:** deploys independientes, pools separados, circuit breaker en pagos.
**Limitación que persiste:** acoplamiento temporal — si payment-service tarda, order-service espera.

> **Notas del orador:** "Cada servicio ahora escala por separado. Pero todavía hay un problema: la cadena de llamadas síncronas suma latencias y acopla temporalmente los servicios."

---

## Slide 7 — Fase 2B: Event-Driven `(5:30 – 6:30)`

### Fase 2B — AWS SQS/SNS: el sistema que "piensa en eventos"

**El cambio de paradigma:** de "llamar y esperar" a "publicar y reaccionar".

**Saga coreografiada del checkout:**
```
order.created → stock.reserved → payment.processed → order.confirmed
     (202 ms)        (async)          (async)             (async)
```
El cliente recibe `202 Accepted` en < 200ms. La confirmación llega por WebSocket.

**Patrones aplicados:**

| Patrón | Función |
|---|---|
| **SNS (fan-out)** | Un evento llega a múltiples consumidores en paralelo |
| **SQS por consumidor** | Cada servicio tiene su cola — desacoplamiento total |
| **CQRS en catalog** | Read model separado actualizado por eventos, sin tocar el primary |
| **Dead Letter Queues** | Eventos fallidos se reintentan sin perder mensajes |
| **Idempotencia** | Tracking de event IDs para evitar doble procesamiento |

**REST síncrono vs Event-Driven — comparación directa:**

| Aspecto | Paso A: REST síncrono | Paso B: Event-Driven |
|---|---|---|
| Acoplamiento temporal | Alto — todos deben estar disponibles a la vez | Bajo — el broker encola hasta que el consumidor esté listo |
| Latencia de checkout | Alta — suma de latencias de cada servicio | < 200ms — responde tras publicar `OrderCreated` |
| Fallo de notificaciones | Bloquea respuesta al cliente | Emails quedan encolados, checkout sigue funcionando |
| Fallo de pagos | Degrada todo el flujo | Aislado tras confirmación de stock |
| Agregar nuevo comportamiento | Modificar `order-service` | Agregar un suscriptor nuevo sin tocar el core |
| Observabilidad | HTTP traces simples | Requiere ID de correlación en eventos asíncronos |
| Consistencia | Inmediata pero bloqueante | Eventual (stock visible en < 1s tras evento) |

> **Notas del orador:** "El trade-off más importante: ganamos resiliencia y latencia, pero ahora el frontend no puede mostrar 'Pago aprobado' instantáneamente vía HTTP clásico — necesita WebSockets o polling. Eso es un cambio de diseño de UX deliberado, no un accidente."

---

## Slide 8 — Fase 3: Robustez y Escalabilidad `(6:30 – 7:00)`

### Fase 3 — Tres capas de robustez

**Cache (Redis)**
- Cache-Aside: catálogo y perfiles de vendedor (TTL 5 min)
- Write-Through: inventario (TTL 30s) — evita oversale
- JWT validation nativa en Redis — deslogout centralizado antes de expiración criptográfica
- Rate limiting con `INCR` atómico — sin locks
- **Invalidación activa por eventos:** cuando un vendedor actualiza un producto, `product.updated` dispara `DEL` explícito en Redis — no depende solo del TTL
→ **10-20x velocidad en lecturas frecuentes**

**Balanceo y Réplicas**
- ALB (capa 7): terminación TLS + ruteo por path → `api-gateway`
- ClusterIP (capa 4): balanceo inter-servicios sin overhead HTTP
- **Round Robin** → `catalog-service` (costo computacional uniforme por petición)
- **Least Connections** → `payment-service` (tiempos asimétricos por respuesta del proveedor externo)
- Read replicas: catalog (×2), inventory (×1) — primary solo para escrituras críticas
→ **Lectura escalable sin tocar el primary**

**Auto-scaling (HPA) — umbrales por servicio**

| Servicio | Scale-out | Scale-in | Réplicas mín. | Razón |
|---|---|---|---|---|
| api-gateway | 70% | 30% | 2 | Entrada de todo el tráfico |
| catalog-service | 70% | 30% | 3 | Máximo tráfico de lectura |
| inventory-service | 75% | 35% | 2 | Tolerante a latencia breve |
| order-service | 65% | 30% | 2 | Coordinador crítico |
| payment-service | **60%** | **25%** | 2 | Alerta temprana — fallo impacta revenue |
| auth-service | 70% | 30% | 2 | Requerido por toda petición |

Liveness probe: ¿el proceso responde? / Readiness probe: ¿conexiones a PG y Redis establecidas?
→ **Elasticidad sin intervención manual**

> **Notas del orador:** "El TTL de 30 segundos en inventario no es arbitrario: es el tiempo máximo tolerable de inconsistencia de stock antes de que el oversale sea un problema real para el negocio. Cada parámetro tiene su justificación."

---

## Slide 9 — Fase 4: Infraestructura como Código `(7:00 – 7:30)`

### Fase 4 — Infraestructura reproducible: Terraform + GitOps

**Terraform modular:**

| Módulo | Gestiona |
|---|---|
| `networking` | VPC, subnets, security groups |
| `kubernetes` | EKS cluster, node groups, IAM roles |
| `database` | RDS PostgreSQL Multi-AZ, réplicas |
| `cache` | ElastiCache Redis Cluster |
| `monitoring` | CloudWatch dashboards, alertas, log groups |

- **3 workspaces:** `qa` / `staging` / `production` — mismo código, configuración diferente
- **Estado remoto:** S3 + DynamoDB lock — ningún engineer puede corromper el estado
- **`prevent_destroy`** en RDS, Redis y bucket de estado — protección contra accidentes
- **VPC dedicada para PROD** — no-prod comparten VPC aislada; PROD no tiene comunicación directa con ellos

**Secretos gestionados con External Secrets Operator (ESO):**
AWS Secrets Manager → sincroniza automáticamente → secretos de Kubernetes. Cero secretos en el repositorio.

**GitOps con ArgoCD:**
El pipeline publica imágenes Docker en ECR con tag del hash de commit. ArgoCD detecta el cambio y aplica el manifest en el cluster EKS correspondiente.

> **Notas del orador:** "La infraestructura pasa por el mismo PR review que el código. Si algo sale mal, el rollback es un `git revert`. Eso es lo que significa 'infraestructura como código'."

---

## Slide 10 — Fase 4: Pipeline CI/CD y Costos `(7:30 – 8:00)`

### Pipeline CI/CD — De commit a producción con gates automáticos

**Por cada Pull Request:**
`lint → typecheck → tests (cobertura ≥ 80%) → SAST (Snyk CVSS ≥ 7.0 bloquea) → build Docker → push ECR`

**Strategy matrix — 10 servicios en paralelo:**
Gateway + 9 microservicios se compilan y validan simultáneamente. Un fallo aísla solo el servicio fallido.

**Flujo de deploy por ambiente:**

```
feature/* → PR → develop ──auto──► QA (ECS mínimo)
                                    │
                               suite 100% verde
                                    │
                              release/* ──auto──► STAGING (near-prod + UAT)
                                                   │
                                              sign-off PO
                                                   │
                                    main ──manual aprobado──► PROD
```

**Costo total de infraestructura PROD: ~$1.332/mes**

| Componente | Costo/mes |
|---|---|
| RDS PostgreSQL Multi-AZ | $673 (50%) |
| ElastiCache Redis HA Cluster | $301 (23%) |
| EKS + nodos m5.large + EBS | $267 (20%) |
| ALB + SQS/SNS + CloudWatch + NAT | $91 (7%) |

> **Notas del orador:** "El costo es 7-10x el monolito inicial ($130/mes). Pero también es 100x la capacidad, alta disponibilidad real y operaciones completamente automáticas. El costo por pedido procesado bajó, no subió."

---

## Slide 11 — Fase 5: Integración con IA `(8:00 – 8:30)`

### Fase 5 — El sistema que "piensa": integración de LLM

**Principio de diseño:** el AI es valor agregado, nunca una dependencia crítica del checkout.

**`ai-service` — microservicio independiente:**
- BullMQ sobre Redis para jobs asíncronos con retry exponencial en errores 429
- Timeout + fail-fast + degradación graceful si el LLM no responde
- Si ai-service cae: el checkout, el stock y los pagos siguen funcionando sin cambios

**2 casos de uso implementados:**

| Caso de uso | Flujo | Beneficio |
|---|---|---|
| **Auto-enriquecimiento de productos** | Vendedor sube producto → AI genera descripción SEO + sugiere categoría automáticamente | Reduce tiempo de carga de catálogo de minutos a segundos |
| **Chatbot de soporte** | WebSocket + LLM consulta order-service en tiempo real → responde estado de envíos | Reduce tickets de soporte de "¿dónde está mi pedido?" |

**Costo operativo:** ~$4/mes para 27.000 requests (gpt-4o-mini) — prácticamente despreciable frente a los $1.332 de infraestructura.

> **Notas del orador:** "La decisión arquitectónica clave aquí es BullMQ: los jobs de AI se encolan, se reintentan automáticamente si el proveedor limita las llamadas, y nunca bloquean el flujo principal del usuario."

---

## Slide 12 — Decisiones Clave y Trade-offs `(8:30 – 9:00)`

### Las decisiones que definieron el sistema

| Decisión | Elegido | Alternativa descartada | Justificación |
|---|---|---|---|
| **Pasarela de pagos** | **Shopify (delegado)** | Pasarela in-house | Construir pasarela propia exige certificar **PCI-DSS** — costo técnico y legal insostenible. Delegar libera al equipo para enfocarse en los diferenciadores reales |
| Message broker cloud | AWS SQS/SNS | RabbitMQ · Kafka | Managed service nativo en AWS — sin ops de broker, IaC integrado, SLA garantizado |
| Saga pattern | Coreografiada | Orquestada (conductor central) | Menos acoplamiento, sin Single Point of Failure en el coordinador |
| Cache | Redis | Memcached | Operaciones atómicas (`INCR`), TTL granular por clave, invalidación activa por eventos |
| IaC state | S3 + DynamoDB | Terraform Cloud | Control propio del estado, sin dependencia de vendor adicional |
| Respuesta del checkout | Async (202 Accepted) | Sync (esperar confirmación) | < 200ms percibido vs. esperar toda la cadena; UX activo compensado con WebSocket |
| Inicio con monolito | Monolito modular | Microservicios desde día 1 | Para < 500 clientes es overhead puro; evolución planificada más efectiva que distribución prematura |

> **Notas del orador:** "Cada decisión tiene su alternativa analizada y su justificación documentada. Esto es lo que diferencia diseño de arquitectura de 'lo primero que se me ocurrió'."

---

## Slide 13 — Conclusiones `(9:00 – 9:30)`

### Lo que construimos — y lo que aprendimos

**Evolución completa:**
Monolito → REST microservicios → Event-Driven → Cache + Réplicas + HPA → IaC + CI/CD → IA

Cada paso respondió a necesidad de escala real — no a un capricho tecnológico (*Hype-Driven Development*).

**Logros técnicos medibles:**

| Métrica | Monolito | Arquitectura final |
|---|---|---|
| Disponibilidad | 98.1% | **99.5%** |
| Respuesta checkout | 2.8s | **< 200ms** |
| Deploys | Con downtime | **Sin downtime (rolling update)** |
| Escalado | Manual | **Automático (HPA)** |
| Infraestructura | Click-ops | **100% reproducible desde código** |

**¿Qué haría diferente con más tiempo?**
- CQRS completo en más servicios (no solo catalog) — especialmente para inventarios multi-almacén
- OpenTelemetry + **Jaeger** para trazabilidad distribuida end-to-end con latencia por milisegundo
- Migrar a **Apache Kafka** cuando el throughput supere la capacidad de SQS/SNS — Event Log inmutable

**¿Cuándo usar esta arquitectura?**
A partir de ~500 usuarios concurrentes sostenidos, o cuando distintos dominios tienen carga muy desigual y necesitan escalar de forma independiente.

> **Notas del orador:** Cierre honesto. No solo qué hicimos bien, sino qué haríamos diferente. Eso muestra madurez técnica real.

---

## Slide 14 — Preguntas `(9:30 – 10:00)`

### ¿Preguntas?

---

**Código Cuatro**
github.com/juanpablovaldez/codigo-cuatro

Nacho Mignone · UNSTA · 2026
