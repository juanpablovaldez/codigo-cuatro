---
title: "Fase 3 — Estrategia de Caché para Alta Disponibilidad"
tags: [fase-3, cache, redis, alta-disponibilidad, nestjs]
fase: 3
issues: ["#10"]
estado: completo
relacionado:
  - "[[06-microservicios-tradicionales]]"
---

# Fase 3 - Estrategia de Caché para Alta Disponibilidad

## 1. Contexto

La arquitectura de microservicios definida en la Fase 2 distribuye la carga entre 9 servicios con bases de datos independientes. Sin embargo, bajo alta demanda, los servicios con mayor tráfico de lectura (catálogo, stock, sesiones) generan una presión sostenida sobre sus bases de datos que puede degradar la experiencia de compra.

El problema concreto en un e-commerce multivendedor con alta concurrencia es el siguiente:

| Patrón de acceso | Impacto sin caché |
|-----------------|-------------------|
| Miles de clientes navegan el catálogo al mismo tiempo | El `catalog-service` ejecuta las mismas queries a PostgreSQL repetidamente |
| Cada request valida el JWT contra `auth-service` | La validación de tokens genera carga constante aunque el token no cambie |
| Los clientes consultan disponibilidad de stock antes de comprar | El `inventory-service` recibe consultas de lectura mucho más frecuentes que las de escritura |
| El API Gateway aplica rate limiting por IP | Necesita un contador rápido por IP en cada request |

Una capa de caché resuelve estos problemas manteniendo en memoria los resultados más solicitados, evitando que cada request llegue hasta la base de datos.

---

## 2. Elección de tecnología: Redis

Se elige **Redis** sobre Memcached. La justificación es la siguiente:

| Criterio | Redis | Memcached |
|---------|-------|-----------|
| Estructuras de datos | Strings, hashes, sets, sorted sets, listas | Solo key-value (strings) |
| TTL granular por clave | Sí | Sí |
| Persistencia opcional | Sí (RDB / AOF) | No |
| Operaciones atómicas | Sí (INCR, SETNX, Lua) | Limitado |
| Pub/Sub nativo | Sí (útil para invalidación) | No |
| Alta disponibilidad | Redis Cluster / Sentinel | Depende de cliente |
| Ecosistema Node.js | `ioredis`, `@nestjs/cache-manager` | `memjs` |

Redis es la elección correcta para este sistema porque:

- El rate limiting del API Gateway requiere contadores atómicos (`INCR` + `EXPIRE`), que Redis soporta de forma nativa.
- La invalidación activa de caché se simplifica con operaciones `DEL` atómicas.
- El ecosistema NestJS tiene soporte oficial para Redis mediante `@nestjs/cache-manager`.
- Redis Cluster o AWS ElastiCache (Redis) permite alta disponibilidad con failover automático.

**Memcached** sería aceptable para un caso de uso puramente de cacheo de strings simples, pero en este sistema la diversidad de patrones de acceso justifica Redis.

---

## 3. Qué se cachea y por qué

No todo se cachea. La decisión de qué datos van a caché se basa en dos factores: **frecuencia de lectura** y **frecuencia de cambio**. Los datos que se leen mucho y cambian poco son los candidatos ideales.

| Dato | Servicio dueño | Frecuencia de lectura | Frecuencia de cambio | ¿Se cachea? |
|------|---------------|----------------------|----------------------|-------------|
| Listado de productos del catálogo | catalog-service | Muy alta | Baja (vendedor edita ocasionalmente) | ✅ Sí |
| Detalle de un producto | catalog-service | Muy alta | Baja | ✅ Sí |
| Resultados de búsqueda con filtros | catalog-service | Alta | Media | ✅ Sí |
| Datos del comercio/vendedor | user-service | Alta | Muy baja | ✅ Sí |
| Disponibilidad de stock | inventory-service | Alta | Media-alta | ✅ Sí (TTL corto) |
| Validación de JWT | auth-service | Muy alta (1 por request) | Baja (hasta expiración) | ✅ Sí |
| Contadores de rate limiting | API Gateway | Muy alta | Continua | ✅ Sí (nativo Redis) |
| Estado de un pedido | order-service | Media | Alta (muchos cambios de estado) | ❌ No |
| Operaciones de pago | payment-service | Baja | Alta | ❌ No |
| Logs de auditoría | admin-service | Baja | Continua | ❌ No |

Los pedidos y los pagos **no se cachean** porque cambian con mucha frecuencia y requieren consistencia inmediata. Servir un estado de pedido desactualizado desde caché podría confundir al cliente o al vendedor.

---

## 4. Estrategia de caché por servicio

### 4.1 Cache-Aside (Lazy Loading) — catalog-service, user-service

Es la estrategia más usada. El servicio consulta primero la caché. Si hay un hit, devuelve el dato. Si hay un miss, va a la base de datos, guarda el resultado en caché y lo devuelve.

```
Request → cache-service
             │
         HIT ┤          MISS
             │             │
             ▼             ▼
        Respuesta      PostgreSQL
        inmediata          │
                           ▼
                      Guardar en Redis
                           │
                           ▼
                       Respuesta
```

**Ventajas**: solo se cachea lo que realmente se consulta. Si la caché se vacía, el sistema sigue funcionando (degrada a BD).  
**Desventaja**: el primer request después de un miss o TTL siempre va a la BD (cold miss).

Se aplica en `catalog-service` para productos, categorías y resultados de búsqueda.

---

### 4.2 Write-Through + Cache-Aside — inventory-service

El stock tiene un perfil especial: se lee mucho (durante navegación y checkout) pero también se escribe con frecuencia (al confirmar pedidos). Si se usa solo Cache-Aside, hay riesgo de servir disponibilidad desactualizada.

Con Write-Through, cada vez que se actualiza el stock en la base de datos, también se actualiza la caché en la misma operación:

```
Confirmar pedido
      │
      ▼
inventory-service
      │
      ├──► UPDATE PostgreSQL (stock -= cantidad)
      │
      └──► SET Redis (inventory:stock:{product_id} = nuevo_valor)
```

**Ventaja**: la caché siempre tiene el valor más reciente después de una escritura.  
**Desventaja**: escribe dos veces en cada operación. Aceptable porque las escrituras de stock son menos frecuentes que las lecturas.

---

### 4.3 TTL nativo de Redis — auth-service (JWT)

La validación de JWT no necesita ir a la base de datos. El token es autosuficiente (contiene claims firmados). Sin embargo, verificar la firma criptográfica en cada request tiene costo de CPU.

La estrategia es cachear el resultado de la validación (válido/inválido + payload del usuario) usando el token como clave, con un TTL igual al tiempo de expiración del propio token.

```
Key:   auth:token:{hash_del_jwt}
Value: { userId, role, companyId }
TTL:   tiempo_restante_del_token (máx 15 minutos)
```

Cuando el token expira en Redis, también expiró en el sistema. No hay riesgo de inconsistencia.

---

### 4.4 Contadores atómicos — API Gateway (rate limiting)

Redis es ideal para rate limiting porque soporta `INCR` atómico y `EXPIRE` en una sola operación:

```
Por cada request entrante:
  key = "ratelimit:{ip}:{ventana_de_1_minuto}"
  count = INCR key
  if count == 1: EXPIRE key 60
  if count > 100: rechazar con 429 Too Many Requests
```

Esto no requiere ninguna base de datos. Redis es el almacén definitivo para este dato.

---

## 5. Políticas de TTL por tipo de dato

| Dato cacheado | Clave Redis | TTL | Justificación |
|--------------|-------------|-----|---------------|
| Listado de productos por categoría | `catalog:list:{categoria}:{pagina}` | 5 min | Cambios poco frecuentes, alto volumen de lectura |
| Detalle de un producto | `catalog:product:{id}` | 5 min | Igual al anterior |
| Resultados de búsqueda | `catalog:search:{hash_de_filtros}` | 2 min | Más volátil por combinaciones de filtros |
| Datos del comercio | `user:company:{id}` | 10 min | Muy estables, vendedores rara vez editan su perfil |
| Disponibilidad de stock | `inventory:stock:{product_id}` | 30 seg | Crítico para evitar mostrar stock incorrecto |
| Resultado de validación JWT | `auth:token:{hash_jwt}` | TTL del token | No puede exceder la expiración del token |
| Contadores rate limiting | `ratelimit:{ip}:{minuto}` | 60 seg | Ventana deslizante de 1 minuto |

El TTL de 30 segundos para stock es el balance entre rendimiento (no golpear la BD en cada consulta de catálogo) y consistencia (no mostrar disponibilidad incorrecta por mucho tiempo).

---

## 6. Invalidación activa de caché

El TTL garantiza que los datos eventualmente expiren, pero en algunos casos hay que invalidar antes de que venza el TTL para evitar mostrar información incorrecta.

| Evento | Clave a invalidar | Servicio responsable |
|--------|------------------|----------------------|
| Vendedor edita un producto | `catalog:product:{id}` + `catalog:list:*` (por patrón) | catalog-service |
| Vendedor edita datos de su comercio | `user:company:{id}` | user-service |
| Se confirma un pedido (stock descontado) | `inventory:stock:{product_id}` | inventory-service (ya actualizada por Write-Through) |
| Producto dado de baja | `catalog:product:{id}` | catalog-service |

La invalidación de claves con patrón (`catalog:list:*`) usa el comando `SCAN` + `DEL` de Redis para evitar el comando `KEYS` que bloquea el servidor en producción.

---

## 7. Diagrama: dónde vive la caché en la arquitectura

```
                    ┌──────────────────────────────┐
                    │         API Gateway           │
                    │  rate limiting → Redis        │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  auth-service    │    │  catalog-service │    │  user-service    │
│                  │    │                  │    │                  │
│  1. check Redis  │    │  1. check Redis  │    │  1. check Redis  │
│  2. si miss:     │    │  2. si miss:     │    │  2. si miss:     │
│     validar JWT  │    │     query DB     │    │     query DB     │
│  3. SET en Redis │    │  3. SET en Redis │    │  3. SET en Redis │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         │         ┌─────────────┼──────────────┐        │
         └─────────►             │              ◄────────┘
                   │      Redis Cluster          │
                   │   (AWS ElastiCache)         │
                   │                             │
                   │  Namespacing por prefijo:   │
                   │  auth:*, catalog:*,         │
                   │  inventory:*, user:*,       │
                   │  ratelimit:*                │
                   └─────────────┬──────────────┘
                                 │
                   ┌─────────────▼──────────────┐
                   │      inventory-service      │
                   │                             │
                   │  Lectura: check Redis       │
                   │  Escritura: Write-Through   │
                   │  (actualiza Redis + DB)     │
                   └─────────────┬──────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       PostgreSQL         │
                    │  (por servicio, sin      │
                    │   acceso directo entre   │
                    │   servicios)             │
                    └─────────────────────────┘
```

Un único **Redis Cluster compartido** con namespacing por prefijo. No un Redis por servicio: eso duplicaría la infraestructura sin beneficio real. El aislamiento se logra por convención de nombre de claves.

---

## 8. Riesgos y mitigaciones

### 8.1 Cache Stampede (Thundering Herd)

**Problema**: cuando una clave popular expira, decenas de requests simultáneos detectan el miss al mismo tiempo y todos van a la BD a rehidratar la clave. Esto genera un pico brusco en la base de datos justo cuando más tráfico hay.

**Mitigación**: usar el patrón **Probabilistic Early Expiration** o un **mutex distribuido con Redis**:

```
// Mutex con SETNX
lock_key = "lock:catalog:product:{id}"
acquired = SET lock_key 1 NX EX 5   // solo un proceso toma el lock
if acquired:
    data = query_db()
    SET cache_key data EX 300
    DEL lock_key
else:
    sleep(50ms) y reintentar
    // el segundo proceso espera que el primero llene la caché
```

---

### 8.2 Inconsistencia eventual

**Problema**: hay una ventana de tiempo (igual al TTL) en la que la caché puede servir datos desactualizados. Si un vendedor actualiza el precio de un producto, los clientes pueden ver el precio viejo hasta que expire la clave.

**Mitigación**:
- TTL razonable según la criticidad del dato (5 min para precios, 30 seg para stock).
- Invalidación activa cuando hay escrituras: el `catalog-service` borra la clave al recibir un `PUT /products/:id`.
- Para stock, Write-Through garantiza que la caché refleja el valor correcto inmediatamente después de cada escritura.

---

### 8.3 Cold Start (Warm-Up)

**Problema**: después de un deploy, reinicio del servicio o pérdida del cluster de Redis, la caché está vacía. Todo el tráfico inicial cae sobre las bases de datos.

**Mitigación**: precalentamiento al arrancar el servicio. El `catalog-service` puede cargar en Redis los 100 productos más consultados (según métricas) antes de empezar a atender tráfico:

```
Al iniciar catalog-service:
  1. Consultar métricas → top 100 product_ids más vistos
  2. GET de cada producto desde PostgreSQL
  3. SET en Redis con TTL normal
  4. El servicio empieza a atender requests con caché caliente
```

---

## 9. Impacto esperado en latencia y throughput

| Escenario | Sin caché | Con caché | Mejora estimada |
|-----------|-----------|-----------|-----------------|
| GET detalle de producto (cache hit) | ~15-40ms (query BD) | ~1-3ms (Redis) | ~10-20x más rápido |
| Listado de productos con filtros (cache hit) | ~30-80ms (query compleja) | ~1-3ms | ~15-30x más rápido |
| Validación de JWT (cache hit) | ~5-10ms (verificación crypto) | ~1ms | ~5-10x más rápido |
| Consulta de stock disponible (cache hit) | ~10-20ms | ~1ms | ~10-20x más rápido |
| Throughput del catálogo en pico | limitado por conexiones PostgreSQL | limitado por Redis (>100k ops/seg) | Orden de magnitud mayor |

Los valores de latencia asumen un Redis en la misma red privada del clúster (RTT < 1ms). La mejora real depende de la tasa de cache hits, que con TTL de 5 minutos y patrones de acceso concentrados debería superar el 80-90% para el catálogo.

---

## 10. Tabla de decisión: resumen

| Qué se cachea | Clave Redis | TTL | Estrategia | Invalidación activa |
|--------------|-------------|-----|------------|---------------------|
| Detalle de producto | `catalog:product:{id}` | 5 min | Cache-Aside | Sí (al editar producto) |
| Listado por categoría | `catalog:list:{cat}:{pag}` | 5 min | Cache-Aside | Sí (al editar producto) |
| Búsqueda con filtros | `catalog:search:{hash}` | 2 min | Cache-Aside | No (expira por TTL) |
| Datos del comercio | `user:company:{id}` | 10 min | Cache-Aside | Sí (al editar comercio) |
| Disponibilidad de stock | `inventory:stock:{id}` | 30 seg | Write-Through | No (actualizada en escritura) |
| Validación JWT | `auth:token:{hash}` | TTL del token | TTL nativo | No (expira con el token) |
| Rate limiting | `ratelimit:{ip}:{min}` | 60 seg | Contador atómico | No (ventana deslizante) |

---

## 11. Conclusión

La capa de caché sobre Redis resuelve el principal cuello de botella de la Fase 2: el catálogo de productos y la validación de sesiones generan una alta tasa de lecturas repetidas que no necesitan ir a la base de datos en cada request.

La estrategia diferenciada por tipo de dato (Cache-Aside para catálogo, Write-Through para stock, TTL nativo para JWT, contadores atómicos para rate limiting) responde a los patrones de acceso reales del e-commerce multivendedor y evita aplicar caché de forma genérica sin justificación.

Los tres riesgos principales (cache stampede, inconsistencia eventual y cold start) tienen mitigaciones concretas implementables sin complejidad adicional significativa.

Esta capa de caché, combinada con la replicación de base de datos (Read Replicas) y los balanceadores de carga, forma la base de robustez de la Fase 3.

> [!info] Diseños pendientes
> La estrategia de Read Replicas (issue **#11**) y los balanceadores de carga con auto-scaling (issue **#12**) están en curso. Sus documentos (`11-read-replicas` y `12-balanceadores-autoscaling`) serán enlazados desde el [[README]] cuando estén disponibles.
