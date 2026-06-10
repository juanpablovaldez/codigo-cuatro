# Fase 1 - Arquitectura Inicial y Justificación

## 1. Arquitectura Inicial y Justificación

Para el MVP del sistema se propone una arquitectura inicial basada en un **Monolito Modular con patrón MVC y separación por capas**.

El sistema definido es un **e-commerce multivendedor para comercios locales**, donde clientes pueden comprar productos online, vendedores pueden administrar su catálogo y pedidos, y un administrador puede supervisar la plataforma.

La arquitectura monolítica es adecuada para esta primera etapa porque el volumen inicial estimado es bajo a medio. Según la definición del negocio, el MVP contempla aproximadamente entre 5 y 20 comercios, entre 100 y 500 clientes registrados, entre 10 y 50 usuarios concurrentes y entre 20 y 100 pedidos diarios.

Con ese volumen, no se justifica iniciar directamente con microservicios, ya que eso agregaría complejidad innecesaria en despliegue, comunicación entre servicios, monitoreo, infraestructura y mantenimiento. Para esta etapa, el objetivo principal es validar el modelo de negocio, construir las funcionalidades principales y mantener una operación simple.

La decisión de utilizar un monolito no se basa en preferencia personal, sino en las restricciones actuales del proyecto: bajo volumen inicial, equipo reducido, menor costo operativo y necesidad de validar rápido el MVP.

Para evitar un monolito desordenado, el sistema se organizará internamente por capas y módulos funcionales. Esto permite mantener separación de responsabilidades y deja preparada una posible evolución futura si el negocio crece.

---

## 2. Patrón arquitectónico seleccionado

El patrón seleccionado es:

**Monolito Modular + MVC + Capas N-Tier**

La división propuesta es:

```txt
Cliente Web
   ↓
Frontend
   ↓
Controladores
   ↓
Servicios de Negocio
   ↓
Repositorios / ORM
   ↓
Base de Datos
```

La responsabilidad de cada capa será:

* **Frontend:** interfaz de usuario para clientes, vendedores y administrador.
* **Controladores:** reciben las solicitudes HTTP y coordinan las respuestas.
* **Servicios de negocio:** contienen reglas, validaciones y casos de uso.
* **Repositorios / ORM:** gestionan el acceso a la base de datos.
* **Base de datos:** almacena usuarios, comercios, productos, stock, pedidos y pagos.

---

## 3. Componentes principales del sistema

| Componente           | Responsabilidad                                                 | Tecnología elegida          | Justificación                                                                 |
| -------------------- | --------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| Frontend             | Permitir la interacción de clientes, vendedores y administrador | React + Vite                | Permite construir una interfaz web simple, modular y reutilizable para el MVP |
| Backend monolítico   | Centralizar la lógica principal del sistema                     | Node.js + NestJS            | Permite organizar el backend en controladores, servicios y módulos            |
| Controladores        | Recibir solicitudes HTTP y devolver respuestas                  | NestJS Controllers          | Separan la entrada de datos de la lógica de negocio                           |
| Servicios de negocio | Aplicar reglas, validaciones y casos de uso                     | NestJS Services             | Evitan mezclar lógica de negocio con acceso a datos                           |
| Módulo de usuarios   | Gestionar registro, login y roles                               | NestJS + JWT                | Permite diferenciar clientes, vendedores y administradores                    |
| Módulo de comercios  | Gestionar comercios registrados                                 | NestJS Module               | Separa la administración de vendedores dentro del sistema                     |
| Módulo de productos  | Gestionar catálogo, precios y categorías                        | NestJS Module + Prisma      | Es una función central del e-commerce                                         |
| Módulo de stock      | Controlar disponibilidad de productos                           | NestJS Service + PostgreSQL | Evita vender productos sin disponibilidad                                     |
| Módulo de pedidos    | Registrar compras y estados del pedido                          | NestJS Module               | Representa el flujo principal del negocio                                     |
| Módulo de pagos      | Registrar o simular pagos del pedido                            | Servicio interno            | Para el MVP alcanza con una integración simple o simulada                     |
| ORM                  | Gestionar modelos y consultas a datos                           | Prisma                      | Ordena el acceso a la base de datos y evita SQL disperso                      |
| Base de datos        | Persistir la información principal                              | PostgreSQL                  | Es adecuada para datos relacionales como usuarios, productos, pedidos y pagos |

---

## 4. Stack tecnológico inicial

| Área                 | Tecnología        |
| -------------------- | ----------------- |
| Frontend             | React + Vite      |
| Backend              | Node.js + NestJS  |
| Lenguaje             | TypeScript        |
| Base de datos        | PostgreSQL        |
| ORM                  | Prisma            |
| Autenticación        | JWT               |
| Documentación API    | Swagger / OpenAPI |
| Testing inicial      | Jest              |
| Contenedores         | Docker Compose    |
| Control de versiones | Git + GitHub      |

### Justificación del stack

Se utiliza **React + Vite** porque permite construir una interfaz web clara y componentizada, adecuada para un sistema con diferentes tipos de usuarios.

Se utiliza **Node.js + NestJS** porque permite estructurar el backend con módulos, controladores y servicios. Esto ayuda a mantener orden interno dentro del monolito.

Se utiliza **PostgreSQL** porque el sistema maneja datos estructurados y relacionados, como usuarios, comercios, productos, pedidos, pagos y stock.

Se utiliza **Prisma** porque permite centralizar el acceso a datos mediante modelos y consultas ordenadas, evitando que la lógica de base de datos quede mezclada con la lógica de negocio.

Se utiliza **Docker Compose** para facilitar la ejecución del entorno de desarrollo y mantener una configuración reproducible.

---

## 5. Diagrama de arquitectura inicial

```txt
┌──────────────────────────────┐
│          Usuario Web          │
│ Cliente / Vendedor / Admin    │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│           Frontend            │
│        React + Vite           │
└───────────────┬──────────────┘
                │ HTTP / REST
                ▼
┌──────────────────────────────────────────┐
│        Backend Monolítico Modular         │
│        Node.js + NestJS                   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │          Controladores              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       Servicios de Negocio          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Repositorios / ORM           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Módulos: Usuarios, Comercios, Productos │
│  Stock, Pedidos, Pagos y Administración │
└─────────────────┬────────────────────────┘
                  │
                  ▼
┌──────────────────────────────┐
│        PostgreSQL             │
│        Base de Datos          │
└──────────────────────────────┘
```

---

## 6. Límites de la arquitectura inicial

Aunque el monolito modular es suficiente para el MVP, tiene límites técnicos claros.

El primer límite es el **escalado único**. Si un módulo recibe mucha carga, no se puede escalar de forma independiente. Por ejemplo, si el catálogo recibe muchas consultas, se debe escalar todo el backend aunque los demás módulos no lo necesiten.

El segundo límite es el **despliegue único**. Cada cambio en cualquier módulo obliga a desplegar toda la aplicación. Esto puede ser aceptable al inicio, pero se vuelve riesgoso si el sistema crece.

El tercer límite es la **base de datos compartida**. Para el MVP simplifica el desarrollo, pero con mayor volumen de productos, pedidos y usuarios puede convertirse en un cuello de botella.

El cuarto límite es el **acoplamiento interno**. Aunque el código esté separado por módulos, todos los módulos siguen dentro de una misma aplicación. Si el equipo crece, pueden aparecer conflictos y dependencias internas.

El quinto límite es la **menor tolerancia a fallos**. Un error grave dentro del backend puede afectar a varias funcionalidades al mismo tiempo.

---

## 7. Puntos de quiebre

| Punto de quiebre                        | Qué ocurre                                        | Impacto                                                       |
| --------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Aumento fuerte de usuarios concurrentes | Muchos clientes navegan o compran al mismo tiempo | Mayor consumo de recursos del backend                         |
| Catálogo muy grande                     | Miles de productos con búsquedas y filtros        | Consultas más lentas                                          |
| Alto volumen de pedidos                 | Muchas compras simultáneas                        | Riesgo de lentitud o errores en operaciones críticas          |
| Alta demanda sobre stock                | Muchos usuarios compran los mismos productos      | Riesgo de inconsistencias o sobreventa                        |
| Pagos externos                          | El proveedor de pago puede tener demoras o fallos | El backend puede quedar esperando respuestas externas         |
| Notificaciones masivas                  | Muchos avisos por compras o cambios de estado     | Consumo de recursos que puede afectar operaciones principales |
| Crecimiento del equipo                  | Más desarrolladores modifican el mismo backend    | Más conflictos y dificultad de mantenimiento                  |

---

## 8. Escenario con 10x usuarios

Si el sistema crece 10 veces respecto del MVP, podría pasar aproximadamente a:

| Métrica               | MVP inicial |  Escenario 10x |
| --------------------- | ----------: | -------------: |
| Usuarios concurrentes |     10 a 50 |      100 a 500 |
| Comercios registrados |      5 a 20 |       50 a 200 |
| Clientes registrados  |   100 a 500 |  1.000 a 5.000 |
| Productos publicados  | 300 a 2.000 | 3.000 a 20.000 |
| Pedidos diarios       |    20 a 100 |    200 a 1.000 |

En este escenario, el monolito todavía podría ser suficiente, pero requeriría optimizaciones:

* Mejorar consultas a la base de datos.
* Agregar índices.
* Usar paginación en listados.
* Incorporar caché en consultas frecuentes.
* Aumentar recursos del servidor.
* Mejorar logging y monitoreo.
* Automatizar pruebas y despliegues.

Con 10x usuarios no sería obligatorio migrar inmediatamente a microservicios, pero el sistema ya debería prepararse para un posible crecimiento mayor.

---

## 9. Escenario con 100x usuarios

Si el sistema crece 100 veces respecto del MVP, podría pasar aproximadamente a:

| Métrica               | MVP inicial |   Escenario 100x |
| --------------------- | ----------: | ---------------: |
| Usuarios concurrentes |     10 a 50 |    1.000 a 5.000 |
| Comercios registrados |      5 a 20 |      500 a 2.000 |
| Clientes registrados  |   100 a 500 |  10.000 a 50.000 |
| Productos publicados  | 300 a 2.000 | 30.000 a 200.000 |
| Pedidos diarios       |    20 a 100 |   2.000 a 10.000 |

En este escenario, el monolito modular comenzaría a ser insuficiente.

Los módulos tendrían necesidades distintas:

* El catálogo necesitaría soportar muchas lecturas.
* Los pedidos necesitarían alta consistencia.
* El stock necesitaría control más estricto de concurrencia.
* Los pagos deberían aislarse por depender de servicios externos.
* Las notificaciones deberían ejecutarse en segundo plano.
* La administración no necesitaría los mismos recursos que el checkout o el catálogo.

Con 100x usuarios, el problema principal es que el monolito obliga a escalar toda la aplicación como una sola unidad. Por eso, en este punto sería razonable evaluar una evolución hacia microservicios o servicios desacoplados.

---

## 10. Deudas técnicas conocidas desde el inicio

| Deuda técnica                 | Por qué se acepta inicialmente                | Riesgo futuro                                       |
| ----------------------------- | --------------------------------------------- | --------------------------------------------------- |
| Monolito con despliegue único | Simplifica el MVP                             | Cada cambio obliga a desplegar toda la aplicación   |
| Base de datos única           | Reduce complejidad inicial                    | Puede convertirse en cuello de botella              |
| Escalado único del backend    | Es suficiente para bajo volumen               | No permite escalar módulos críticos por separado    |
| Pagos dentro del backend      | Para el MVP puede manejarse simple o simulado | Fallos externos pueden afectar el sistema principal |
| Notificaciones internas       | Evita agregar infraestructura extra al inicio | Pueden consumir recursos de operaciones importantes |
| Logging básico                | Alcanza para la primera versión               | Dificulta diagnosticar problemas en producción      |
| Testing inicial limitado      | Permite avanzar más rápido                    | Aumenta el riesgo de errores al crecer              |
| Sin caché distribuida         | No es necesaria al inicio                     | El catálogo puede volverse lento con más tráfico    |

---

## 11. Conclusión

Para el MVP del e-commerce multivendedor se propone una arquitectura inicial basada en un **Monolito Modular con MVC y separación por capas**.

Esta arquitectura es suficiente para arrancar porque el volumen inicial esperado es bajo a medio, el equipo es reducido y el objetivo principal es validar el negocio con baja complejidad operativa.

La decisión está justificada por restricciones concretas: simplicidad, costo, velocidad de desarrollo y volumen inicial. Aun así, se documentan límites claros: escalado único, despliegue único, base de datos compartida, acoplamiento interno y menor tolerancia a fallos.

Con un crecimiento de 10x usuarios, el monolito podría seguir funcionando con optimizaciones. Con un crecimiento de 100x usuarios, comenzaría a ser insuficiente y sería necesario evaluar una evolución hacia una arquitectura más distribuida.
