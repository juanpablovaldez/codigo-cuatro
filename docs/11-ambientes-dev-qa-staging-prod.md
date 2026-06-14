# Estructura de Ambientes: DEV / QA / STAGING / PROD

**Fase 4 — Infraestructura y DevOps**
Issue de referencia: [#13](https://github.com/juanpablovaldez/codigo-cuatro/issues/13)

---

## 1. Contexto y Propósito

Un sistema de e-commerce en producción requiere una separación clara de ambientes que permita desarrollar, testear y validar sin afectar a los usuarios reales. A medida que el sistema crece, la probabilidad de introducir regresiones aumenta: sin ambientes separados, un bug en una nueva feature puede impactar directamente en el procesamiento de órdenes o en el stock de los vendedores.

La separación en cuatro ambientes permite un flujo progresivo de confianza: el código pasa de local a automático a near-prod a prod, acumulando validaciones en cada etapa antes de llegar al usuario final.

---

## 2. Decisión de Naming

Se eligió **DEV / QA / STAGING / PROD** en lugar de la terminología Desa / QA / UAT / Prod por las siguientes razones:

- **UAT (User Acceptance Testing)** es una *actividad*, no un ambiente. El ambiente donde esa actividad ocurre se denomina correctamente **STAGING**.
- **STAGING** es el término estándar en la industria (AWS Environments, GitHub Environments, Vercel, Railway, Heroku). Usar el nombre correcto facilita la lectura de la documentación por parte de cualquier desarrollador.
- Para un e-commerce, STAGING tiene valor propio más allá del UAT: es donde se testean integraciones con payment gateways en sandbox mode, webhooks de logística y flujos de stock con datos near-reales — aspectos que no se pueden validar con datos sintéticos de QA.

> El UAT como actividad *ocurre dentro de STAGING*: el Product Owner valida contra datos anonimizados de producción en un ambiente que replica fielmente la configuración de PROD.

Esta nomenclatura es coherente con el GitFlow ya definido en el repositorio (ver `README.MD` y issue #4), donde las ramas se mapean a ambientes de la siguiente manera:

| Rama | Ambiente |
|---|---|
| `feature/*` | DEV |
| `develop` | QA |
| `release/*` | STAGING |
| `main` | PROD |

---

## 3. Los 4 Ambientes

### 3.1 DEV — Development

**Propósito:** Entorno de trabajo individual del desarrollador. Aquí se escribe y se prueba el código antes de compartirlo con el equipo.

- **Rama GitFlow:** `feature/*`
- **Infraestructura:** Local, orquestada con Docker Compose. Levanta los 4 microservicios (api-gateway, auth-service, inventory-service, order-service), RabbitMQ y PostgreSQL en contenedores locales.
- **Datos:** Seeds de datos sintéticos (JSON fixtures). Nunca se usan datos reales ni PII en este ambiente.
- **Herramientas activas:** `ts-node` con hot reload, ESLint, Prettier, logs en nivel `DEBUG` (verbose).
- **Quién accede:** Únicamente el desarrollador que trabaja en esa feature branch.
- **Criterio de salida:** Pull Request abierto, code review aprobado por al menos un compañero → merge a `develop`.

---

### 3.2 QA — Quality Assurance

**Propósito:** Ambiente de integración continua. Cada merge a `develop` dispara un deploy automático y la ejecución de la suite de tests. Es el primer ambiente en la nube y el primer checkpoint automático de calidad.

- **Rama GitFlow:** `develop`
- **Infraestructura:** AWS ECS (instancias mínimas, costo reducido) vía Terraform workspace `qa`. Deploy automático gatillado por el pipeline CI/CD (GitHub Actions) en cada merge a `develop`.
- **Datos:** Dataset de prueba fijo, reseteado al inicio de cada ciclo de CI. Sin PII.
- **Qué se ejecuta:**
  - Tests unitarios por servicio
  - Tests de integración: servicios ↔ RabbitMQ ↔ PostgreSQL
  - Tests E2E básicos sobre la API Gateway (happy path de los endpoints críticos)
- **Quién ejecuta:** CI/CD automático (GitHub Actions). El QA engineer puede ejecutar regresiones manuales puntuales.
- **Criterio de salida:** Suite de tests 100% verde → se crea la rama `release/*` para iniciar el ciclo de STAGING.

---

### 3.3 STAGING — Pre-producción / UAT

**Propósito:** Réplica fiel de producción con datos anonimizados. Cumple dos roles: (a) smoke tests automatizados post-deploy y (b) validación manual por el Product Owner (UAT).

- **Rama GitFlow:** `release/*`
- **Infraestructura:** AWS ECS con la misma configuración y tipos de instancia que PROD. Terraform workspace `staging`. Deploy automático al crear o actualizar una rama `release/*`.
- **Datos:** Copia anonimizada de producción. Antes de cada ciclo de STAGING se ejecuta obligatoriamente un script de anonimización:
  - Nombres, emails, DNIs y teléfonos → valores faker
  - Datos de pago → zeroed (número de tarjeta, CVV, etc.)
  - IDs de usuarios/vendors → hasheados (mantiene las referencias entre registros válidas)
- **Particularidad e-commerce:** En STAGING se validan integraciones que QA no puede testear con datos sintéticos:
  - Payment gateways en modo sandbox (MercadoPago, Stripe)
  - Webhooks de logística con endpoints de staging del proveedor
  - Flujos de stock y reservas con volumen near-real
- **Quién valida:** Product Owner + QA engineer. El PO firma formalmente la aceptación (sign-off).
- **Criterio de salida:** Sign-off del PO + smoke tests verdes → merge de `release/*` a `main` + creación del tag `vX.Y.Z`.

---

### 3.4 PROD — Production

**Propósito:** Ambiente en vivo. Sirve tráfico real de usuarios finales. Máxima estabilidad y disponibilidad.

- **Rama GitFlow:** `main`
- **Infraestructura:** AWS con alta disponibilidad:
  - ECS con Auto Scaling (escala según carga)
  - RDS PostgreSQL Multi-AZ (failover automático)
  - Redis ElastiCache Cluster (replicación)
  - RabbitMQ en cluster (alta disponibilidad del broker)
  - Terraform workspace `production`
- **Salvaguardas:**
  - Branch protection en `main`: PR obligatorio + mínimo 1 approval + CI verde antes de merge
  - Prohibición de force push y de commits directos a `main`
  - Cero deploys manuales: todo deploy pasa por el pipeline aprobado de CI/CD
- **Monitoreo:** CloudWatch métricas y alertas, health checks activos por servicio, log aggregation centralizado.
- **Datos:** Datos reales. Backups automáticos diarios (RDS snapshots con retención de 7 días).

---

## 4. Tabla Comparativa

| Dimensión | DEV | QA | STAGING | PROD |
|---|---|---|---|---|
| Rama Git | `feature/*` | `develop` | `release/*` | `main` |
| Infraestructura | Docker Compose local | AWS ECS mínimo | AWS ECS near-prod | AWS ECS + Auto Scaling (HA) |
| Base de datos | PostgreSQL (Docker) | PostgreSQL RDS single-AZ | PostgreSQL RDS (datos anonimizados) | PostgreSQL RDS Multi-AZ |
| Cache | Redis (Docker) | Redis ElastiCache single node | Redis ElastiCache | Redis ElastiCache Cluster |
| Message Broker | RabbitMQ (Docker) | RabbitMQ EC2 | RabbitMQ near-prod | RabbitMQ Cluster |
| Terraform workspace | N/A | `qa` | `staging` | `production` |
| Datos | Sintéticos/seeds | Dataset de prueba fijo | Anonimizados de PROD | Datos reales |
| Accesos | Solo el dev de la feature | CI/CD + QA engineer | PO + QA (smoke tests) | Usuarios finales |
| Deploy trigger | Manual (`docker-compose up`) | Auto (merge a `develop`) | Auto (push a `release/*`) | Manual aprobado (merge a `main`) |
| `LOG_LEVEL` | `debug` | `info` | `info` | `warn` |
| Monitoreo | N/A | CI reporta resultados de tests | Smoke tests automatizados | CloudWatch + alertas |
| Payment gateways | Mocks locales | Mocks locales | Sandbox del proveedor | Live (producción del proveedor) |

---

## 5. Política de Datos Sensibles en Ambientes No-Prod

La regla fundamental es: **ningún dato real puede existir fuera de PROD sin haber pasado por el pipeline de anonimización.**

| Ambiente | Política de datos |
|---|---|
| **DEV** | Exclusivamente JSON fixtures con datos inventados. Prohibido usar dumps de QA, STAGING o PROD. |
| **QA** | Dataset fijo generado desde seeds. Se regenera al inicio de cada ciclo de CI. Sin PII en ningún campo. |
| **STAGING** | Copia de PROD procesada por el script de anonimización. El script es obligatorio, auditado y versionado en el repositorio. |
| **PROD** | Datos reales con acceso restringido. Solo el equipo de infraestructura puede acceder a la base de datos directamente. |

**Datos que siempre deben anonimizarse antes de salir de PROD:**
- Nombres y apellidos de clientes y vendedores
- Emails y números de teléfono
- DNI / CUIT / documentos de identidad
- Datos de pago (número de tarjeta, CVV, fecha de vencimiento)
- Direcciones de entrega

---

## 6. Variables de Entorno Críticas por Ambiente

Las variables de entorno son el mecanismo principal de configuración diferenciada entre ambientes. Nunca se hardcodean valores de producción en el código.

| Variable | DEV | QA | STAGING | PROD |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `test` | `staging` | `production` |
| `DATABASE_URL` | `postgres://localhost:5432/tfi_dev` | `postgres://rds-qa.aws.../tfi_qa` | `postgres://rds-staging.aws.../tfi_staging` | `postgres://rds-prod.aws.../tfi_prod` |
| `REDIS_URL` | `redis://localhost:6379` | `redis://elasticache-qa.aws...` | `redis://elasticache-staging.aws...` | `redis://elasticache-prod.aws...` |
| `RABBITMQ_URL` | `amqp://localhost:5672` | `amqp://rabbitmq-qa.aws...` | `amqp://rabbitmq-staging.aws...` | `amqp://rabbitmq-prod.aws...` (cluster) |
| `LOG_LEVEL` | `debug` | `info` | `info` | `warn` |
| `JWT_SECRET` | `dev-secret-local` | GitHub Actions Secret | GitHub Actions Secret | AWS Secrets Manager |
| `PAYMENT_GATEWAY_MODE` | `mock` | `mock` | `sandbox` | `live` |
| `PAYMENT_GATEWAY_KEY` | N/A | N/A | Clave sandbox (GitHub Secret) | Clave live (AWS Secrets Manager) |

**Gestión de secretos por ambiente:**
- **DEV:** Variables en `.env` local (en `.gitignore`, nunca commiteado).
- **QA y STAGING:** GitHub Actions Secrets inyectados durante el pipeline.
- **PROD:** AWS Secrets Manager. Ningún secreto de producción existe en GitHub ni en archivos del repositorio.

---

## 7. Diagrama de Flujo entre Ambientes

```
┌─────────────────────────────────────────────────────────────────┐
│                        [Desarrollador]                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │ crea rama feature/*
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DEV — feature/* (local)                                        │
│  Docker Compose · datos sintéticos · ts-node · logs DEBUG       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Pull Request + code review aprobado
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  QA — develop (AWS ECS mínimo)                                  │
│  Deploy automático · tests unitarios + integración + E2E        │
│  Dataset de prueba fijo · sin PII                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Suite 100% verde → crear release/*
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGING — release/* (AWS ECS near-prod)                        │
│  Datos anonimizados de PROD · smoke tests · payment sandbox     │
│  UAT: sign-off formal del Product Owner                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Sign-off PO + smoke tests verdes
                              │ merge a main + tag vX.Y.Z
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROD — main (AWS ECS HA · Multi-AZ)                            │
│  Datos reales · CloudWatch · backups automáticos                │
│  Branch protection · cero deploys manuales                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Coherencia con la Estrategia DevOps del Proyecto

Este diseño de ambientes es la base sobre la que se construyen los siguientes componentes de la Fase 4:

| Issue | Componente | Dependencia con este documento |
|---|---|---|
| #14 | Estrategia de branching | El mapeo rama→ambiente definido aquí es la fuente de verdad para el diagrama de flujo de #14 |
| #15 | Pipeline CI/CD | Los triggers de deploy (merge a `develop` → QA, push a `release/*` → STAGING, merge a `main` → PROD) son los eventos que el pipeline implementa |
| #16 | Docker y Kubernetes | La infraestructura por ambiente (Docker Compose local, ECS en cloud con K8s) es el input para el diseño de contenedores |
| #17 | Terraform (IaC) | Los workspaces `qa`, `staging` y `production` son los environments que Terraform gestiona |
