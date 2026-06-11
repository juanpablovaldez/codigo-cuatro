# Reporte de Implementación del Esqueleto de Microservicios

Este reporte documenta la implementación de los tres microservicios, el proxy inverso API Gateway, los stubs del Message Broker, las configuraciones de Docker y el historial de commits realizados paso a paso para construir el esqueleto del proyecto.

---

## 1. Estructura de Carpetas

La siguiente estructura de carpetas fue creada dentro del directorio `services/` y en la raíz del repositorio:

```txt
tfi/
├── docker-compose.yml                      # Orquestador raíz
├── docs/
│   └── 00-reporte-esqueleto.md             # Este reporte
└── services/
    ├── api-gateway/                        # Proxy inverso Express (stub)
    │   ├── src/
    │   │   └── main.ts
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    ├── auth-service/                       # Microservicio de autenticación (Puerto 3001)
    │   ├── src/
    │   │   ├── broker/
    │   │   │   └── broker.client.ts        # Mock publicador/suscriptor del broker
    │   │   └── main.ts
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    ├── inventory-service/                  # Microservicio de inventario (Puerto 3004)
    │   ├── src/
    │   │   ├── broker/
    │   │   │   └── broker.client.ts
    │   │   └── main.ts
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    └── order-service/                      # Microservicio de pedidos (Puerto 3005)
        ├── src/
        │   ├── broker/
        │   │   └── broker.client.ts
        │   └── main.ts
        ├── Dockerfile
        ├── package.json
        └── tsconfig.json
```

---

## 2. Historial de Commits

La construcción del proyecto fue dividida en commits incrementales para mantener un historial de Git limpio, donde cada commit representa una fase bien definida de la configuración inicial:

```txt
* 7fb0d20 chore: add docker-compose and base Dockerfiles
* ef44a15 feat: configure api-gateway reverse proxy stub
* 86b8f24 feat: configure mock message broker client connection in all services
* 1c5b45d feat: initialize skeletons for auth, order, and inventory services
```

---

## 3. Descripción de cada Commit

### Commit 1: `feat: initialize skeletons for auth, order, and inventory services`
* **Cambios realizados**: Inicialización de las carpetas para `auth-service`, `order-service` e `inventory-service`.
* **Descripción**: Se configuraron los archivos base de Node.js (`package.json`), las configuraciones de TypeScript (`tsconfig.json`) y los servidores web mínimos con Express (`src/main.ts`) escuchando en sus puertos respectivos (3001, 3005 y 3004), sin ninguna lógica de negocio.

### Commit 2: `feat: configure mock message broker client connection in all services`
* **Cambios realizados**: Se agregó un stub del cliente de mensajería bajo `src/broker/broker.client.ts` en cada servicio.
* **Descripción**: Simula el ciclo de vida de conexión y los métodos publicar/suscribir (Pub/Sub) del Message Broker. La función `bootstrap()` de cada `main.ts` fue actualizada para aguardar la conexión simulada al broker antes de iniciar el servidor HTTP.

### Commit 3: `feat: configure api-gateway reverse proxy stub`
* **Cambios realizados**: Inicialización de la carpeta `services/api-gateway/`.
* **Descripción**: Se construyó un proxy gateway basado en Express utilizando `http-proxy-middleware`. Escucha en el puerto `3000` y redirige el tráfico de la siguiente manera:
  * `/auth/*` → `http://localhost:3001` (Auth Service)
  * `/inventory/*` → `http://localhost:3004` (Inventory Service)
  * `/orders/*` → `http://localhost:3005` (Order Service)

### Commit 4: `chore: add docker-compose and base Dockerfiles`
* **Cambios realizados**: Se agregaron configuraciones `Dockerfile` multi-stage para todos los servicios y el API Gateway. Se añadió un `docker-compose.yml` en la raíz del proyecto.
* **Descripción**: Los Dockerfiles compilan los archivos TypeScript a JavaScript para su ejecución en producción. El `docker-compose.yml` orquesta el API Gateway, los tres microservicios y un contenedor de RabbitMQ (`rabbitmq:3-management`) en una red de tipo bridge compartida llamada `tfi_network`.
