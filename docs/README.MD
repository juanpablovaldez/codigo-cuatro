### **1. Planteo Arquitectónico Inicial**
Para esta etapa fundacional (MVP), se ha diseñado una **Arquitectura Monolítica basada en un modelo Cliente-Servidor**.

* **Capa de Presentación (Cliente Web):** Interfaz de usuario dinámica que consume datos de forma asíncrona, optimizada para ofrecer una experiencia fluida e interactiva en el navegador.
* **Capa de Lógica de Negocio (Servidor de Aplicación):** Un monolito centralizado, estructurado internamente mediante el patrón de diseño por capas (Controladores, Servicios, Repositorios) o MVC tradicional.
* **Capa de Persistencia:** Sistema de Gestión de Bases de Datos Relacionales (RDBMS).
* **Integraciones Externas:** Delegación de procesamiento de pagos y envío de comunicaciones a servicios de terceros a través de APIs.

### **2. Justificación Técnica y de Negocio**

Cada decisión arquitectónica en esta fase responde a la necesidad de lanzar un producto funcional, seguro y mantenible, minimizando la complejidad operativa inicial:

* **¿Por qué un Monolito para arrancar?** En la fase inicial de un e-commerce, el volumen de tráfico suele ser bajo a moderado. Un monolito permite un *time-to-market* ágil, unifica el proceso de despliegue y reduce drásticamente los costos de infraestructura. Separar el sistema prematuramente en microservicios añadiría una latencia de red innecesaria y una complejidad operativa injustificada para el volumen de negocio actual.
* **Elección del Patrón por Capas:** La separación interna del backend en capas bien definidas (enrutamiento, reglas de negocio y acceso a datos) fomenta la escritura de un código modular y altamente testeable. Este aislamiento de responsabilidades facilitará enormemente la futura extracción de dominios hacia microservicios en fases posteriores.
* **Elección de Persistencia Relacional:** La naturaleza transaccional de un e-commerce exige un control estricto sobre el inventario y las finanzas. Un motor relacional asegura el cumplimiento de las propiedades ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad). Esto es fundamental para garantizar la integridad referencial y evitar anomalías como la venta en simultáneo de un mismo artículo sin stock.
* **Límites de la Arquitectura:** Este modelo encontrará su cuello de botella frente a picos masivos de concurrencia. Al intentar escalar el sistema horizontalmente, el monolito obliga a replicar la aplicación en su totalidad (consumiendo más memoria y cómputo global) en lugar de escalar únicamente el servicio estresado (como podría ser el motor de búsqueda del catálogo), volviéndose ineficiente a nivel de costos.

### **3. Descripción de los Componentes y Flujo End-to-End**

A continuación, se detalla el comportamiento de los componentes frente a una petición crítica del sistema: **El proceso de Checkout**.

1. **Interacción en el Cliente Web:** El usuario finaliza su selección y presiona la acción de pago. El cliente compila los datos del carrito y envía la carga útil (*payload*) mediante una petición HTTP POST al servidor.
2. **Validación en el Servidor de Aplicación:** La capa de controladores recibe la petición. La capa de servicios verifica la autenticación del usuario y consulta mediante la capa de repositorios la disponibilidad real de los artículos.
3. **Persistencia y Bloqueo Transaccional:** Se abre una transacción en la base de datos relacional. Si existe disponibilidad, se descuenta temporalmente el stock (bloqueo lógico preventivo) y se genera la entidad de la orden en estado "Pendiente".
4. **Integración Externa (Pagos):** Por normativas de seguridad e industria, el servidor propio no procesa credenciales financieras directamente. Se realiza una llamada externa síncrona a la API del proveedor de pagos, delegando el procesamiento del cobro.
5. **Notificación Asíncrona:** Tras recibir la confirmación (mediante *webhook* o respuesta síncrona) de que el pago fue aprobado, la base de datos consolida la transacción del pedido. Inmediatamente, el servidor dispara un evento hacia el servicio de mensajería externo para enviar el comprobante digital al usuario.
6. **Respuesta Final:** El servidor retorna un código de éxito HTTP al cliente web, cerrando el circuito y permitiendo que la interfaz redirija a la pantalla de confirmación de compra.
