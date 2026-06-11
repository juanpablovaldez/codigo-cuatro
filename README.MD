# codigo-cuatro

**Trabajo Final Integrador — Desarrollo de Aplicaciones Web**
Materia: Desarrollo de Aplicaciones Web · UNSTA

---

## Descripción del Proyecto

**codigo-cuatro** es una plataforma de **e-commerce multivendedor para comercios locales**. Su objetivo es resolver la falta de centralización en las ventas digitales, permitiendo que pequeños y medianos comercios gestionen sus productos, stock, pedidos y ventas desde una única plataforma.

El sistema conecta a tres actores principales: clientes que compran productos online, vendedores que administran su catálogo y stock, y un administrador general que supervisa la plataforma.

---

## Stack Tecnológico

| Área | Tecnología |
|------|------------|
| Backend (microservicios) | Node.js + TypeScript + Express |
| API Gateway | Express + http-proxy-middleware |
| Base de datos | PostgreSQL 16 |
| Message Broker | RabbitMQ |
| Contenedores | Docker + Docker Compose |
| Infraestructura | Terraform + AWS |
| Linter | ESLint + TypeScript ESLint |
| Formatter | Prettier |

---

## Estructura del Repositorio

```txt
codigo-cuatro/
├── docs/                        # Documentación técnica del TFI (por fase)
├── services/
│   ├── api-gateway/             # Proxy inverso (punto de entrada único)
│   ├── auth-service/            # Autenticación y JWT (Puerto 3001)
│   ├── inventory-service/       # Control de stock (Puerto 3004)
│   └── order-service/           # Gestión de pedidos (Puerto 3005)
├── docker-compose.yml           # Orquestación local de todos los servicios
├── .gitignore
├── .eslintrc.json
└── .prettierrc.json
```

---

## Estrategia de Ramas: GitFlow

Este repositorio utiliza **GitFlow** como estrategia de ramas. La elección se justifica porque permite un control claro del ciclo de vida del software en múltiples ambientes, lo cual es coherente con la estrategia de infraestructura definida en la Fase 4 del TFI.

### Diagrama de Ramas

```
main
 └─ develop
      ├─ feature/nombre-de-feature
      ├─ release/vX.Y.Z
      └─ hotfix/descripcion-del-fix
```

### Descripción de cada Rama

| Rama | Propósito | Ambiente asociado |
|------|-----------|-------------------|
| `main` | Código estable y liberado a producción | Producción |
| `release/*` | Estabilización previa al release (smoke testing) | UAT (Pre-producción) |
| `develop` | Integración continua de todas las features completadas | QA / Testing |
| `feature/*` | Desarrollo activo de nuevas funcionalidades | Desarrollo (local) |
| `hotfix/*` | Correcciones urgentes sobre producción | Producción (emergencia) |

### Justificación

- **GitFlow** fue elegido sobre GitHub Flow o Trunk-Based Development porque el proyecto tiene múltiples ambientes claramente diferenciados (Dev, QA, UAT, Prod), lo que se alinea directamente con los ambientes definidos en la Fase 4 del TFI.
- La separación entre `main` y `develop` garantiza que el código que llega a producción pasó primero por integración, testing y validación.
- Las ramas `feature/*` permiten que distintos dominios del sistema (auth, orders, inventory) se desarrollen en paralelo sin interferir entre sí.
- Las ramas `release/*` permiten preparar y estabilizar una versión antes de hacer el merge final a `main`, habilitando smoke tests en UAT.
- Las ramas `hotfix/*` permiten responder a incidentes de producción sin interrumpir el flujo de desarrollo en curso sobre `develop`.

### Flujo de Trabajo

```
feature/nueva-funcionalidad
    │
    └─► develop  (merge via Pull Request + code review)
             │
             └─► release/v1.0.0  (stabilization + QA tests)
                      │
                      └─► main  (merge → tag → deploy to Prod)
                      └─► develop  (back-merge para mantener sincronía)
```

---

## Cómo Ejecutar Localmente

### Requisitos previos
- Node.js v20+
- Docker + Docker Compose

### Opción 1: Ejecutar con Docker Compose

```bash
docker-compose up --build
```

Esto levanta: API Gateway (3000), Auth Service (3001), Inventory Service (3004), Order Service (3005) y RabbitMQ (5672 / UI: 15672).

### Opción 2: Ejecutar un servicio individualmente

```bash
cd services/auth-service
npm install
npm start
```

### Endpoints de salud disponibles

| Servicio | URL |
|----------|-----|
| API Gateway | http://localhost:3000/health |
| Auth Service (vía Gateway) | http://localhost:3000/auth/health |
| Inventory Service (vía Gateway) | http://localhost:3000/inventory/health |
| Order Service (vía Gateway) | http://localhost:3000/orders/health |

---

## Documentación Técnica

La documentación completa de cada fase del TFI se encuentra en el directorio [`/docs`](./docs/):

| Archivo | Contenido |
|---------|-----------|
| `01-modelo-negocio.md` | Fase 1: Temática y modelo de negocio |
| `02-arquitectura-inicial.md` | Fase 1: Arquitectura monolítica inicial |
| `06-microservicios-tradicionales.md` | Fase 2A: Microservicios REST síncronos |
| `10-cache-alta-disponibilidad.md` | Fase 3: Caché Redis para alta disponibilidad |
| `00-reporte-esqueleto.md` | Reporte de implementación del esqueleto |
