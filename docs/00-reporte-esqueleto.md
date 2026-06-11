# Microservices Skeleton Implementation Report

This report documents the implementation of the three microservices, API Gateway proxy, message broker stubs, Docker configurations, and the step-by-step git commits made to build the project.

---

## 1. Directory Structure

The following folder structure was created under the `services/` directory and workspace root:

```txt
tfi/
├── docker-compose.yml                      # Root orchestrator
├── docs/
│   └── 00-reporte-esqueleto.md             # This report
└── services/
    ├── api-gateway/                        # Express reverse proxy stub
    │   ├── src/
    │   │   └── main.ts
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    ├── auth-service/                       # Auth microservice stub (Port 3001)
    │   ├── src/
    │   │   ├── broker/
    │   │   │   └── broker.client.ts        # Mock broker publisher/subscriber
    │   │   └── main.ts
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    ├── inventory-service/                  # Inventory microservice stub (Port 3004)
    │   ├── src/
    │   │   ├── broker/
    │   │   │   └── broker.client.ts
    │   │   └── main.ts
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    └── order-service/                      # Orders microservice stub (Port 3005)
        ├── src/
        │   ├── broker/
        │   │   └── broker.client.ts
        │   └── main.ts
        ├── Dockerfile
        ├── package.json
        └── tsconfig.json
```

---

## 2. Commit History

The project build was divided into incremental commits to maintain a clean Git history representing each phase of setup. Below is the commit log showing our additions:

```txt
* 7fb0d20 chore: add docker-compose and base Dockerfiles
* ef44a15 feat: configure api-gateway reverse proxy stub
* 86b8f24 feat: configure mock message broker client connection in all services
* 1c5b45d feat: initialize skeletons for auth, order, and inventory services
```

---

## 3. Commit Breakdown

### Commit 1: `feat: initialize skeletons for auth, order, and inventory services`
* **Changes**: Initialized folders for `auth-service`, `order-service`, and `inventory-service`.
* **Description**: Set up basic Node.js configurations (`package.json`), TypeScript configurations (`tsconfig.json`), and basic Express web server setups (`src/main.ts`) running on their respective ports (3001, 3005, and 3004) without any business logic.

### Commit 2: `feat: configure mock message broker client connection in all services`
* **Changes**: Added a mock Message Broker client stub under `src/broker/broker.client.ts` for each service.
* **Description**: Simulates the publisher-subscriber and broker connection lifecycle. The `bootstrap()` function of each service's `main.ts` was updated to await the broker's connection simulation before starting up.

### Commit 3: `feat: configure api-gateway reverse proxy stub`
* **Changes**: Initialized the `services/api-gateway/` folder.
* **Description**: Built an Express-based gateway proxy utilizing `http-proxy-middleware`. It listens on port `3000` and proxies traffic as follows:
  * `/auth/*` -> `http://localhost:3001` (Auth Service)
  * `/inventory/*` -> `http://localhost:3004` (Inventory Service)
  * `/orders/*` -> `http://localhost:3005` (Order Service)

### Commit 4: `chore: add docker-compose and base Dockerfiles`
* **Changes**: Added multi-stage `Dockerfile` configurations to all services and the API Gateway. Added a root-level `docker-compose.yml`.
* **Description**: The Dockerfiles compile TypeScript source files into JavaScript for production execution. The `docker-compose.yml` orchestrates the API Gateway, the three microservices, and a RabbitMQ container (`rabbitmq:3-management`) on a shared bridge network (`tfi_network`).
