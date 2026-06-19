---
title: "De monolito a microservicios event-driven: lo que nadie te cuenta del camino"
tags: [fase-5, entregable, articulo-tecnico, arquitectura, microservicios]
fase: 5
issues: ["#23"]
estado: completo
relacionado:
  - "[[02-arquitectura-inicial]]"
  - "[[05-escenario-migracion-microservicios]]"
  - "[[06-microservicios-tradicionales]]"
  - "[[07-microservicios-event-driven]]"
  - "[[17-infraestructura-como-codigo-terraform]]"
---

# De monolito a microservicios event-driven: lo que nadie te cuenta del camino

*Publicado en el contexto del Trabajo Final Integrador de Desarrollo de Aplicaciones Web — UNSTA 2026.*

---

## El gancho: ¿por qué debería leerte alguien que programa hoy?

Porque si estás construyendo algo que funciona, en algún momento vas a enfrentar la misma pregunta que nosotros: **¿cuándo deja de ser suficiente lo que tenemos?**

No te voy a vender que los microservicios son la solución a todo. Te voy a contar qué pasó cuando el sistema que diseñamos con cuidado dejó de aguantar, qué decidimos hacer, y por qué algunas de esas decisiones fueron más difíciles de lo que esperábamos. Spoiler: la parte técnica fue la más fácil.

---

## El punto de partida: elegimos el monolito y fue la decisión correcta

Cuando empezamos a diseñar **Código Cuatro** — una plataforma e-commerce multivendedor para comercios locales — la primera tentación fue ir directo a microservicios. Todos los artículos que leímos, todos los tutoriales de YouTube, apuntaban en esa dirección.

No lo hicimos.

El MVP apuntaba a 5-20 comercios, 100-500 clientes, 50 usuarios concurrentes máximo. Para esa escala, distribuir servicios es overhead puro: más latencia de red, más superficie de fallo, más complejidad operativa, sin ningún beneficio real a cambio.

Construimos un **monolito modular en NestJS 11** con 14 módulos bien definidos (auth, catalog, inventory, orders, payments, notifications y más), React 19 en el frontend, PostgreSQL 16, y Terraform para la infra desde el día uno. Corría en AWS por unos $120-180 al mes y hacía exactamente lo que tenía que hacer.

La clave fue documentar explícitamente el límite: *a 100x de la carga proyectada, el monolito falla*. No fue ignorancia. Fue una decisión consciente con fecha de vencimiento conocida.

---

## El momento de quiebre: cuando los números dejan de ser proyecciones

El quiebre no llegó gradualmente. Llegó de golpe.

Una campaña de descuentos regional se viralizó. En cuestión de horas pasamos de escenario controlado a esto:

| Métrica | Proyectado | Real |
|---|---|---|
| Comercios activos | 5–20 | **487** |
| Clientes registrados | 100–500 | **14.300** |
| Usuarios concurrentes | 10–50 | **1.400 (×30)** |
| Pedidos/hora | 10–20 | **820 (~210 RPS, ×80)** |

Los SLAs que definimos como meta dejaron de cumplirse: disponibilidad en 98.1% (meta: 99.5%), tiempo de checkout en 2.8 segundos (meta: <800ms).

No fue un mal diseño. Fue crecimiento inesperado. La diferencia importa porque cambia completamente cómo encarás la solución.

Diagnosticamos **6 cuellos de botella concretos**:

1. El pool de conexiones de la base de datos era compartido — las consultas de catálogo competían con las transacciones de órdenes.
2. Un timeout del proveedor de pagos externo se propagaba en cascada a todo el sistema.
3. Cada deploy requería 15-40 segundos de downtime total — cualquier feature afectaba a todos.
4. Sin control de concurrencia granular, se producía oversale de stock.
5. El envío de emails añadía 1.6 segundos al flujo de checkout del usuario.
6. Con cuatro personas en el mismo codebase, los conflictos de merge eran constantes.

Cada uno de esos problemas tenía una causa diferente. Eso nos dijo que no había una solución única — había que atacarlos por separado.

---

## Desafío 1 — La migración a microservicios: separar sin romper

La primera decisión grande fue descomponer el monolito en **9 microservicios independientes**: auth, user, catalog, inventory, order, payment, notification, storage y admin. Cada uno con su propia base de datos PostgreSQL, su propio proceso, su propio ciclo de deploy.

Un **API Gateway** en el frente como único punto de entrada: validación JWT, rate limiting, routing. Así el cliente nunca habla directamente con un servicio.

Esto resolvió los bottlenecks 1, 2 y 3 de un saque:
- Pool compartido: eliminado. Cada servicio tiene el suyo.
- Timeout en cascada: un Circuit Breaker en payment-service aisla el fallo.
- Deploys con downtime: cada servicio se despliega de forma independiente.

Pero apareció un problema nuevo que no habíamos anticipado del todo: **el acoplamiento temporal**. En el flujo de checkout, order-service llamaba síncronamente a inventory, luego a payment, luego a notification. Si cualquiera de los tres tardaba o fallaba, el usuario esperaba o veía error. Cambiamos el packaging pero no el patrón de comunicación.

Lo que aprendí de esta fase: separar en servicios no es suficiente si los servicios siguen dependiendo unos de otros en tiempo real. La independencia de deploy no es lo mismo que la independencia operativa.

---

## Desafío 2 — Event-Driven: cuando los eventos cambian la forma de pensar el sistema

Este fue el cambio de paradigma más grande del proyecto. Y el más difícil de internalizar.

La idea es simple en papel: en lugar de que order-service llame directamente a inventory, *publica un evento* (`order.created`) en un broker de mensajes. Inventory escucha ese evento, procesa la reserva y publica otro (`stock.reserved`). Payment escucha ese, procesa el cobro y publica otro. Y así sucesivamente.

Usamos **AWS SNS para fan-out** (un evento puede llegar a múltiples consumidores) y **SQS con colas por consumidor** (cada servicio tiene su propia cola, nadie comparte). El patrón se llama Saga coreografiada.

```
order.created → SNS → SQS (inventory) → stock.reserved → SNS → SQS (payment) → ...
```

El resultado concreto: cuando el usuario hace checkout, el sistema responde en **menos de 200 milisegundos** con un `202 Accepted`. No espera a que el pago se procese ni a que llegue el email. Todo eso sucede después, de forma asíncrona. El cliente recibe notificación por WebSocket cuando la orden está confirmada.

Pero el cambio más importante no fue la latencia. Fue la resiliencia:

- Si notification-service cae, los emails quedan encolados. El checkout sigue funcionando.
- Si inventory-service está lento, los eventos se acumulan en la cola. Nadie bloquea a nadie.
- Para agregar un nuevo comportamiento (un programa de fidelización, por ejemplo), solo hay que suscribir un nuevo servicio a `order.confirmed` — sin tocar una sola línea del order-service.

Agregamos también **CQRS en catalog-service**: escrituras a la base de datos primary, lecturas desde un Read Model actualizado por eventos. El 90% del tráfico de catálogo es lectura. No tenía sentido que todas esas consultas compitieran con las escrituras.

Lo que aprendí: los sistemas event-driven no son simplemente "más rápidos". Son sistemas que responden a *hechos pasados* en lugar de depender de la disponibilidad simultánea de otros. Eso cambia completamente cómo razonás sobre los fallos.

El trade-off que nadie menciona: debuggear se vuelve mucho más difícil. Cuando algo falla, tenés que seguir un ID de correlación a través de múltiples colas y logs de distintos servicios. Sin observabilidad distribuida, estás ciego.

---

## Desafío 3 — Infraestructura: lo que nadie te cuenta sobre Kubernetes y Terraform en la práctica

Esta fase fue la que más nos costó no por complejidad técnica, sino por disciplina.

Decidimos que **toda la infraestructura se define como código** (Terraform) y que ningún recurso existe si no está en el repositorio. Sin clics en la consola de AWS. Sin "yo sé cómo está configurado ese security group". Todo versionado, todo revisable, todo reproducible.

Terraform modular con cinco módulos: networking, kubernetes, database, cache y monitoring. Tres workspaces: `qa`, `staging`, `production`. El mismo código, configuración diferente. Estado remoto en S3 con lock en DynamoDB para que dos ingenieros no puedan corromper el estado al mismo tiempo.

Dos decisiones que parecen pequeñas pero importan mucho:
- `prevent_destroy` en RDS y Redis: Terraform rechaza cualquier operación que intente eliminar esos recursos. Protección contra accidentes.
- External Secrets Operator: los secretos viven en AWS Secrets Manager y se sincronizan automáticamente a Kubernetes. Cero variables de entorno hardcodeadas en el repositorio.

Para el CI/CD usamos **GitHub Actions con strategy matrix**: gateway y los 9 microservicios se construyen en paralelo. Cada PR pasa por lint → typecheck → tests (≥80% cobertura) → SAST con Snyk (bloquea si hay CVE con CVSS ≥ 7.0) → build Docker multi-stage → push a ECR con tag del commit SHA. Un fallo aísla solo el servicio que falló.

El deploy a producción es manual y requiere aprobación. No porque no confiemos en el pipeline, sino porque en un e-commerce con pagos reales, nadie quiere que una rama se autopublique en PROD un viernes a las 6pm.

El costo final: **$1.332/mes** en producción. El monolito costaba $130. Es 10x más caro y tiene 100x más capacidad, alta disponibilidad Multi-AZ, operaciones automáticas y rollback en segundos via ArgoCD (`git revert` = rollback de infraestructura).

---

## La integración con IA: cuando el sistema empieza a "pensar"

La última fase fue integrar un LLM al sistema. La decisión de diseño más importante aquí no fue técnica: fue de posicionamiento.

El servicio de IA (`ai-service`) es **valor agregado, nunca una dependencia crítica**. Si cae, el checkout sigue funcionando. Si el LLM no responde, el sistema hace degradación graceful. Esto sonaba obvio al escribirlo pero requirió trabajo concreto para garantizarlo.

Implementamos dos casos de uso:

**Auto-enriquecimiento de productos**: cuando un vendedor sube un producto, un job asíncrono (BullMQ sobre Redis) genera automáticamente la descripción SEO y sugiere la categoría. El vendedor no espera — recibe el resultado por notificación cuando está listo. Tiempo de carga de catálogo: de minutos a segundos.

**Chatbot de soporte**: WebSocket + GPT-4o-Mini que consulta order-service en tiempo real para responder preguntas de estado de envío. Reduce el volumen de tickets de "¿dónde está mi pedido?" sin intervención humana.

Costo total: **~$4/mes** para 27.000 requests con gpt-4o-mini. Prácticamente despreciable comparado con el resto de la infraestructura.

---

## Los 3 aprendizajes más importantes

### 1. El monolito no es el enemigo — el momento equivocado es el enemigo

El error más común que veo en proyectos universitarios y startups es empezar con microservicios "para hacerlo bien". El resultado suele ser un sistema distribuido sin la carga que justifique esa complejidad. Un monolito bien diseñado con límites claros entre módulos es más fácil de entender, de probar y de operar. Y cuando llegue el momento de migrar, los módulos ya son los prototipos de los servicios.

### 2. La complejidad distribuida no desaparece — se redistribuye

Con el monolito, la complejidad estaba en el código: todo junto, difícil de escalar partes específicas. Con microservicios event-driven, la complejidad se mudó a la infraestructura, la observabilidad y las transacciones distribuidas. No es mejor ni peor — es diferente. Tenés que estar dispuesto a invertir en herramientas de trazabilidad (OpenTelemetry, Jaeger) o vas a estar depurando a ciegas.

### 3. Las decisiones de arquitectura son decisiones de negocio

La decisión de usar Shopify para el checkout en lugar de implementar pagos in-house no fue técnica: fue legal. PCI-DSS exige certificación costosa para cualquier sistema que procese datos de tarjetas directamente. Shopify la tiene. Nosotros la delegamos. Eso liberó meses de trabajo de compliance para focalizarnos en lo que realmente diferencia la plataforma.

Cada decisión de arquitectura tiene un costo de oportunidad. No se evalúa solo en términos técnicos.

---

## ¿Cuándo usarías esta arquitectura en la industria real?

Esta es la pregunta honesta que me haría cualquier CTO antes de aprobar este stack.

**Sí la usaría cuando:**
- Tenés más de 500 usuarios concurrentes sostenidos en pico.
- Distintos dominios de tu sistema tienen patrones de carga muy diferentes (catálogo vs. pagos vs. notificaciones).
- Tu equipo tiene más de 4-5 personas trabajando en el mismo sistema y los conflictos de merge se vuelven un cuello de botella en sí mismos.
- Necesitás garantías de disponibilidad por encima del 99% y no podés permitirte que un fallo en notificaciones baje el checkout.

**No la usaría cuando:**
- Estás validando si el producto tiene mercado. Un monolito te lleva a producción en semanas; la arquitectura de este TFI, en meses.
- Tu equipo no tiene experiencia operando Kubernetes o no tiene tiempo para aprender. La curva es real.
- El throughput esperado cabe cómodamente en una máquina vertical. A veces escalar verticalmente ($$$) es más barato que escalar horizontalmente (complejidad).

---

## Conclusión: de programar a diseñar

La transición más grande de este TFI no fue técnica. Fue conceptual.

Programar es resolver un problema en código. Diseñar arquitecturas es tomar decisiones que otros van a vivir con durante años, bajo condiciones que no controlás, con restricciones que van a cambiar.

El monolito era la decisión correcta para el día 1. Los microservicios eran la decisión correcta cuando el negocio los justificó. Event-driven fue la decisión correcta cuando el acoplamiento temporal se convirtió en el cuello de botella. Y Shopify fue la decisión correcta cuando el compliance era el riesgo mayor.

Ninguna de esas decisiones fue obvia de antemano. Todas fueron consecuencia de entender el problema antes de elegir la solución.

Si hay una cosa que me llevo de este proyecto, es esa: **la herramienta correcta depende del contexto, no de las tendencias**. Y el trabajo del arquitecto es tener la claridad para distinguir uno del otro.

---

*Código Cuatro es el Trabajo Final Integrador de Desarrollo de Aplicaciones Web de la Universidad del Norte Santo Tomás de Aquino (UNSTA), 2026. Equipo: Benjamin Lopez Zigaran, Facundo Nosa, Juan Ignacio Mignone, Juan Pablo Valdez.*
