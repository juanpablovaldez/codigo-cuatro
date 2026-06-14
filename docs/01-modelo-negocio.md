---
title: "Fase 1 — Definición de Temática y Modelo de Negocio"
tags: [fase-1, modelo-negocio, ecommerce, temática]
fase: 1
issues: ["#1"]
estado: completo
relacionado:
  - "[[02-arquitectura-inicial]]"
---

Fase 1 - Definición de Temática y Modelo de Negocio

## Descripción del Negocio y Contexto

### 1. Problemática elegida

La problemática elegida para el Trabajo Final Integrador es el desarrollo de un **sistema e-commerce multivendedor para comercios locales**.

El problema principal que se busca resolver es que muchos comercios pequeños y medianos venden sus productos mediante canales poco centralizados, como WhatsApp, Instagram, Facebook Marketplace, hojas de cálculo o atención presencial. Esto genera desorganización en la gestión de productos, falta de control de stock, pedidos poco trazables, errores en la comunicación con clientes y dificultad para escalar las ventas digitales.

El sistema propone una plataforma web que permita a distintos comercios publicar productos, administrar precios y stock, recibir pedidos online y consultar el estado de sus ventas. Al mismo tiempo, los clientes podrán navegar productos, agregarlos al carrito, realizar compras y consultar el estado de sus pedidos desde una única plataforma.

---

### 2. Descripción del sistema

El sistema será una plataforma de e-commerce multivendedor orientada a comercios locales que necesitan digitalizar sus ventas sin desarrollar una tienda online propia. La plataforma permitirá que los vendedores gestionen productos, stock y pedidos, mientras que los clientes podrán registrarse, buscar productos, realizar compras y hacer seguimiento de sus pedidos. Además, contará con un administrador general encargado de supervisar usuarios, comercios, operaciones y actividad general del sistema.

---

### 3. Objetivo del sistema

El objetivo del sistema es centralizar y digitalizar el proceso de venta de comercios locales, permitiendo que puedan operar en línea de manera más ordenada, escalable y trazable.

El sistema busca aportar valor en tres aspectos principales:

* Mejorar la experiencia de compra del cliente.
* Facilitar la gestión operativa de los comercios.
* Crear una plataforma escalable que pueda crecer incorporando más vendedores, productos, pedidos, pagos, logística e integraciones futuras.

---

### 4. Actores principales

| Actor                           | Descripción                                                   | Responsabilidades principales                                                                                     |
| ------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cliente                         | Usuario final que compra productos en la plataforma           | Registrarse, iniciar sesión, buscar productos, agregar productos al carrito, realizar compras y consultar pedidos |
| Vendedor / Comercio             | Comercio local que publica y vende productos                  | Gestionar catálogo, precios, stock, pedidos recibidos y estado de preparación                                     |
| Administrador de la plataforma  | Usuario responsable de la gestión general del sistema         | Administrar usuarios, validar comercios, supervisar operaciones y controlar actividad general                     |
| Servicio de pago externo        | Plataforma externa o simulada encargada de procesar pagos     | Confirmar, rechazar o dejar pendiente una operación de pago                                                       |
| Servicio de notificaciones      | Servicio encargado de informar eventos importantes            | Enviar avisos sobre confirmación de pedidos, cambios de estado o novedades                                        |
| Servicio de logística / entrega | Actor externo o interno relacionado con la entrega de pedidos | Coordinar entrega, retiro o actualización del estado logístico                                                    |

---

### 5. Tabla de actores y flujos principales

| Actor                           | Flujo principal                                  | Resultado esperado                                                                                |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Cliente                         | Se registra o inicia sesión en la plataforma     | Accede a su cuenta y puede operar dentro del sistema                                              |
| Cliente                         | Busca productos y navega el catálogo             | Encuentra productos disponibles según categoría, comercio o búsqueda                              |
| Cliente                         | Agrega productos al carrito y confirma la compra | Se genera un pedido dentro del sistema                                                            |
| Cliente                         | Consulta el estado de un pedido                  | Visualiza si el pedido está pendiente, confirmado, en preparación, enviado, entregado o cancelado |
| Vendedor / Comercio             | Carga o modifica productos                       | El catálogo del comercio queda actualizado                                                        |
| Vendedor / Comercio             | Gestiona el stock disponible                     | El sistema refleja correctamente la disponibilidad de productos                                   |
| Vendedor / Comercio             | Recibe y prepara pedidos                         | El pedido avanza en su ciclo operativo                                                            |
| Administrador                   | Supervisa usuarios y comercios                   | La plataforma mantiene control sobre vendedores y actividad general                               |
| Servicio de pago externo        | Procesa el pago de una compra                    | El pedido queda aprobado, rechazado o pendiente                                                   |
| Servicio de notificaciones      | Envía avisos automáticos                         | Cliente y vendedor reciben información actualizada                                                |
| Servicio de logística / entrega | Coordina la entrega o retiro del pedido          | El pedido llega al cliente o queda marcado como finalizado                                        |

---

### 6. Modelo de negocio

El modelo de negocio se basa en una plataforma e-commerce multivendedor. La plataforma genera valor conectando comercios locales con clientes digitales, permitiendo que los vendedores puedan ofrecer sus productos online sin tener que construir y mantener una tienda propia.

La principal forma de monetización propuesta para el MVP es una **comisión por venta concretada**. Esto significa que la plataforma obtiene un porcentaje de cada operación realizada correctamente dentro del sistema. Este modelo es adecuado para la etapa inicial porque alinea el ingreso de la plataforma con el crecimiento real de los comercios: si los vendedores venden más, la plataforma también genera más ingresos.

A futuro, el modelo de negocio podría ampliarse con:

* Planes de suscripción mensual para comercios.
* Planes premium con mayor visibilidad.
* Publicidad interna de productos destacados.
* Integraciones con logística.
* Reportes avanzados para vendedores.
* Herramientas inteligentes de recomendación o asistencia mediante LLM.

---

### 7. Flujo principal del negocio

El flujo principal comienza cuando un comercio se registra en la plataforma y carga sus productos con nombre, descripción, precio, categoría, imagen y stock disponible. Luego, los clientes ingresan al e-commerce, buscan productos, los agregan al carrito y generan un pedido.

Una vez confirmado el pedido, el sistema valida la disponibilidad de stock y registra la operación. Luego se inicia el proceso de pago, que puede ser aprobado, rechazado o quedar pendiente. Si el pago es aprobado, el sistema confirma el pedido, descuenta el stock correspondiente y notifica tanto al cliente como al vendedor.

Después, el vendedor prepara el pedido y actualiza su estado. Finalmente, el pedido puede ser retirado, enviado o marcado como entregado.

---

### 8. Volumen inicial esperado de usuarios

Para el MVP se estima un **volumen inicial bajo a medio**, ya que el objetivo inicial será validar la solución con una cantidad limitada de comercios, productos y clientes.

| Métrica                  | Estimación inicial |
| ------------------------ | -----------------: |
| Comercios registrados    |             5 a 20 |
| Clientes registrados     |          100 a 500 |
| Usuarios concurrentes    |            10 a 50 |
| Productos publicados     |        300 a 2.000 |
| Pedidos diarios          |           20 a 100 |
| Administradores internos |              1 a 3 |

Esta estimación es consistente con una primera versión del sistema, donde todavía no se requiere una infraestructura distribuida compleja. Sin embargo, la problemática elegida permite una evolución arquitectónica futura si aumentan los usuarios, los pedidos, el catálogo, las integraciones externas o la necesidad de escalar módulos específicos.

---

### 9. Requisitos funcionales de alto nivel

| Código | Requisito funcional                  | Descripción                                                                                                                                |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-01  | Gestión de usuarios y autenticación  | El sistema debe permitir el registro, inicio de sesión y gestión de roles para clientes, vendedores y administradores                      |
| RF-02  | Gestión de comercios                 | El sistema debe permitir registrar, aprobar, editar o deshabilitar comercios dentro de la plataforma                                       |
| RF-03  | Gestión de productos                 | Los vendedores deben poder crear, editar, eliminar y visualizar productos con precio, descripción, categoría, imagen y stock               |
| RF-04  | Gestión de stock                     | El sistema debe permitir controlar la disponibilidad de productos y actualizar el stock luego de una compra confirmada                     |
| RF-05  | Búsqueda y visualización de catálogo | Los clientes deben poder buscar, filtrar y visualizar productos disponibles                                                                |
| RF-06  | Carrito de compras                   | Los clientes deben poder agregar productos al carrito, modificar cantidades y confirmar una compra                                         |
| RF-07  | Gestión de pedidos                   | El sistema debe registrar pedidos y permitir actualizar sus estados: pendiente, confirmado, en preparación, enviado, entregado o cancelado |
| RF-08  | Gestión de pagos                     | El sistema debe permitir registrar o simular pagos asociados a pedidos                                                                     |
| RF-09  | Notificaciones                       | El sistema debe notificar eventos relevantes, como confirmación de compra o cambio de estado del pedido                                    |
| RF-10  | Panel administrativo                 | El administrador debe poder visualizar usuarios, comercios, pedidos y actividad general de la plataforma                                   |

---

### 10. Restricciones no funcionales

| Categoría             | Restricción                                                                                                                                   | Justificación                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Performance           | Las operaciones principales, como login, búsqueda de productos, carga de carrito y creación de pedidos, deben responder en tiempos aceptables | En un e-commerce, una mala experiencia de navegación puede afectar directamente la conversión de ventas |
| Disponibilidad        | El sistema debe estar disponible durante horarios comerciales y períodos de mayor demanda                                                     | La plataforma funciona como canal de venta para los comercios                                           |
| Seguridad             | El sistema debe proteger credenciales, datos personales, roles de usuario y operaciones de compra                                             | Se manejan cuentas de usuario, información comercial y datos asociados a pedidos                        |
| Escalabilidad         | La arquitectura debe permitir crecimiento futuro en usuarios, comercios, productos y pedidos                                                  | El modelo multivendedor puede crecer progresivamente y requerir separación de módulos                   |
| Mantenibilidad        | El sistema debe estar organizado por módulos, capas y responsabilidades claras                                                                | Facilita el desarrollo, la corrección de errores y la evolución hacia arquitecturas más complejas       |
| Consistencia de datos | El stock, los pedidos y los pagos deben mantenerse consistentes                                                                               | Evita vender productos sin disponibilidad o confirmar pedidos incorrectos                               |
| Trazabilidad          | El sistema debe registrar operaciones importantes como compras, cambios de estado y modificaciones de stock                                   | Permite auditoría, soporte al cliente y análisis operativo                                              |
| Integrabilidad        | El sistema debe poder integrarse con servicios externos como pagos, notificaciones, logística o inteligencia artificial                       | El dominio e-commerce requiere interacción con componentes externos                                     |
| Usabilidad            | La interfaz debe ser clara para clientes y vendedores no técnicos                                                                             | Los comercios locales pueden no tener experiencia usando plataformas complejas                          |

---

### 11. Justificación de la temática para evolución arquitectónica

La temática elegida es adecuada para el TFI porque permite justificar una evolución arquitectónica progresiva a lo largo de las fases del proyecto.

En una primera etapa, el sistema puede iniciar con una arquitectura simple, ya que el volumen esperado de usuarios y pedidos es bajo a medio. Sin embargo, el dominio e-commerce multivendedor tiene suficiente complejidad para evolucionar posteriormente hacia una arquitectura más distribuida.

A medida que el negocio crezca, algunos módulos podrían necesitar independencia técnica. Por ejemplo:

* El módulo de autenticación podría separarse como servicio de usuarios.
* El catálogo de productos podría escalar de forma independiente.
* Los pedidos podrían requerir mayor trazabilidad y consistencia.
* Los pagos podrían integrarse con proveedores externos.
* Las notificaciones podrían procesarse de forma asincrónica.
* La logística podría conectarse con servicios de entrega.
* La recomendación de productos o asistencia a vendedores podría incorporar un servicio LLM.

Por este motivo, la problemática no queda limitada a un CRUD simple. El sistema tiene actores, reglas, flujos críticos, integraciones externas y posibles puntos de crecimiento que permiten fundamentar decisiones arquitectónicas futuras.

---

### 12. Conclusión

El sistema propuesto será un e-commerce multivendedor para comercios locales. Su objetivo es resolver la falta de centralización en ventas digitales, permitiendo que comercios pequeños y medianos puedan gestionar productos, stock, pedidos y ventas desde una misma plataforma.

El negocio genera valor al conectar vendedores con clientes digitales y al ordenar el proceso completo de compra. Para el MVP se estima un volumen inicial bajo a medio, lo cual permite comenzar con una arquitectura simple. Sin embargo, el dominio elegido posee suficiente complejidad para justificar una evolución posterior hacia microservicios, infraestructura escalable, automatización de despliegues e integración con servicios externos.
