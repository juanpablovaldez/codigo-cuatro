---
title: "Fase 4 - Estimacion de Costos Cloud"
tags: [fase-4, costos, aws, cloud, dimensionamiento, tfi]
fase: 4
issues: ["#18"]
estado: completo
relacionado:
  - "[[10-cache-alta-disponibilidad]]"
  - "[[12-read-replicas]]"
  - "[[13-balanceadores-autoscaling]]"
  - "[[17-infraestructura-como-codigo-terraform]]"
---

# Fase 4 - Estimacion de Costos y Dimensionamiento Cloud

## 1. Objetivo de la estimacion

El objetivo de este documento es estimar el costo mensual aproximado de ejecutar en AWS la arquitectura final del TFI para `codigo-cuatro`, tomando como base las decisiones ya documentadas en Fase 3 y Fase 4:

- Microservicios desplegados sobre Kubernetes administrado con Amazon EKS.
- Escalabilidad horizontal mediante worker nodes EC2, HPA y Application Load Balancer.
- Persistencia relacional con Amazon RDS PostgreSQL, Multi-AZ y read replicas.
- Cache de alta disponibilidad con Amazon ElastiCache Redis.
- Comunicacion asincronica mediante Amazon SQS, coherente con el diseno event-driven.
- Observabilidad con Amazon CloudWatch.
- Estado remoto de Terraform con Amazon S3 y DynamoDB.

La estimacion sirve como base academica para justificar el dimensionamiento de servidores cloud y el impacto economico de pasar del monolito inicial a una arquitectura distribuida. Los valores son aproximados y deben validarse con AWS Pricing Calculator antes de una implementacion real.

## 2. Alcance y supuestos

| Supuesto | Valor |
|---|---|
| Proveedor cloud | AWS |
| Region | `us-east-1` - US East (N. Virginia) |
| Modalidad | On-Demand mensual |
| Horas mensuales | 730 h/mes |
| Ambiente estimado | Produccion |
| Moneda | USD |
| Tipo de carga | E-commerce multivendedor con picos promocionales |
| Volumen base tomado de Fase 3 | 487 comercios, 14.300 clientes, 38.000 productos, 1.400 usuarios concurrentes y ~210 RPS pico |
| Kubernetes | 1 cluster EKS en soporte estandar |
| Worker nodes | 3 nodos EC2 `t3.large`, segun la parametrizacion productiva de Terraform |
| Base de datos | RDS PostgreSQL con primary Multi-AZ y 2 read replicas |
| Cache | 2 nodos ElastiCache Redis `cache.r6g.large` |
| Trafico SQS | Estimacion conservadora de 10 millones de requests/mes |
| Logs CloudWatch | Estimacion controlada de 30 GB/mes de ingestion y retencion acotada |
| NAT Gateway | 1 NAT Gateway productivo para subnets privadas, justificado por EKS/RDS/ElastiCache en red privada |

No se incluyen costos de soporte AWS Enterprise/Business, transferencia de datos saliente a Internet de alto volumen, dominios, certificados pagos, WAF, backups historicos extensos, herramientas externas de observabilidad, CI runners privados ni ambientes no productivos permanentes. QA/UAT/DEV se tratan en la estrategia de optimizacion.

## 3. Arquitectura final considerada

La arquitectura considerada no agrega componentes nuevos. Toma los componentes ya definidos en los documentos existentes:

- `docs/13-balanceadores-autoscaling.md`: ALB, EKS, Services, HPA, pods y Redis.
- `docs/12-read-replicas.md`: primary database, read replicas, failover y separacion lectura/escritura.
- `docs/10-cache-alta-disponibilidad.md`: Redis/ElastiCache como cache compartida por prefijos.
- `docs/17-infraestructura-como-codigo-terraform.md`: modulos Terraform `networking`, `kubernetes`, `database`, `cache` y `monitoring`, con `t3.large` para nodos productivos, `db.r6g.large` para RDS y `cache.r6g.large` para Redis.

Vista resumida:

```text
Usuarios
  |
  v
Application Load Balancer
  |
  v
Amazon EKS
  - 1 API Gateway NestJS
  - 9 microservicios NestJS
  - HPA por servicios criticos
  |
  +--> Amazon RDS PostgreSQL
  |      - Primary Multi-AZ
  |      - 2 read replicas
  |
  +--> Amazon ElastiCache Redis
  |      - 2 nodos
  |
  +--> Amazon SQS
  |      - colas event-driven
  |
  +--> Amazon CloudWatch
         - logs, metricas y alarmas

Terraform state:
  - Amazon S3
  - DynamoDB lock table
```

## 4. Tabla de costos estimados

Los costos se calculan con la formula general:

```text
costo mensual = precio horario aproximado * 730 h * cantidad
```

Cuando el servicio se cobra por uso y no por hora, se usa un volumen mensual conservador para el TFI.

| Componente | Servicio AWS | Cantidad / tamano | Rol | Costo mensual estimado USD | Justificacion |
|---|---|---:|---|---:|---|
| Entrada HTTP publica | Elastic Load Balancing - Application Load Balancer | 1 ALB + 1 LCU promedio | Punto de entrada HTTPS, terminacion TLS y routing hacia el API Gateway en EKS | 24.24 | La Fase 3 define ALB como balanceador L7. Se estima un ALB activo todo el mes y 1 LCU promedio. |
| Control plane Kubernetes | Amazon EKS | 1 cluster en soporte estandar | Plano de control administrado para ejecutar API Gateway y microservicios | 73.00 | Amazon EKS cobra por cluster/hora; con 730 h/mes se estima el costo fijo del control plane. |
| Compute de microservicios | Amazon EC2 | 3 worker nodes `t3.large` | Capacidad base para pods del gateway y 9 microservicios, con margen para HPA | 182.21 | La IaC documenta 3 nodos productivos `t3.large`. Es suficiente para el volumen del TFI y mantiene costo moderado. |
| Discos de worker nodes | Amazon EBS gp3 | 150 GB totales (3 x 50 GB) | Volumen raiz de nodos EKS, imagenes y espacio operativo del nodo | 12.00 | gp3 es el SSD general recomendado; 50 GB por nodo evita sobredimensionar. |
| Base de datos transaccional | Amazon RDS for PostgreSQL | `db.r6g.large`: primary Multi-AZ + standby + 2 read replicas, 200 GB storage | Persistencia de pedidos, catalogo, usuarios, inventario y administracion; separa lecturas de escrituras | 673.00 | RDS es el mayor costo por disponibilidad y replicas. Multi-AZ sostiene failover y las read replicas responden a la estrategia de Fase 3. |
| Cache distribuida | Amazon ElastiCache for Redis | 2 nodos `cache.r6g.large` | Cache para catalogo, JWT, datos de comercio, stock de lectura y rate limiting | 300.76 | La Fase 3 justifica Redis por lecturas repetidas y contadores atomicos. Dos nodos permiten alta disponibilidad. |
| Mensajeria asincronica | Amazon SQS | 10 millones de requests/mes | Colas para flujos event-driven y desacople temporal entre servicios | 5.00 | SQS es suficiente para el volumen del TFI y evita operar un cluster Kafka/MSK. Incluye margen sobre la capa gratuita. |
| Observabilidad | Amazon CloudWatch | 30 GB logs/mes, metricas estandar, alarmas basicas | Logs centralizados, metricas, alarmas de RDS/EKS/Redis y diagnostico operativo | 25.00 | Se estima una retencion acotada y logs controlados. Puede crecer rapido si se aumenta verbosidad. |
| Estado remoto Terraform | Amazon S3 + DynamoDB | 1 bucket S3 + 1 tabla DynamoDB on-demand | `terraform.tfstate` remoto, locking y auditoria de cambios de infraestructura | 2.00 | El volumen de estado y locks es muy bajo; el costo es casi marginal pero necesario para trabajo en equipo. |
| Salida a Internet desde subnets privadas | NAT Gateway | 1 NAT Gateway + 50 GB procesados/mes | Permite que nodos privados descarguen dependencias, imagenes o actualizaciones sin exponerlos publicamente | 35.10 | Se justifica por la topologia privada documentada en IaC. Debe optimizarse con VPC endpoints para ECR/S3 cuando sea posible. |
| API administrada externa | Amazon API Gateway | No incluido en el escenario base | Alternativa administrada al ALB para exponer APIs HTTP | 0.00 | La arquitectura considerada usa ALB hacia el API Gateway propio en NestJS. No se suma API Gateway para evitar doble capa de entrada. |

## 5. Total mensual estimado

| Concepto | Costo mensual estimado |
|---|---:|
| Total arquitectura cloud final | **1.332,31 USD / mes** |

Este total representa el costo mensual On-Demand aproximado de produccion en `us-east-1`, sin descuentos, sin compromisos y sin ambientes no productivos permanentes.

## 6. Comparacion contra el monolito inicial

La arquitectura inicial documentada en Fase 1 era suficiente para un MVP de bajo/medio volumen. Un monolito inicial en AWS podria operar con una infraestructura mucho menor:

| Arquitectura | Componentes representativos | Costo mensual aproximado | Lectura tecnica |
|---|---|---:|---|
| Monolito inicial MVP | 1 ALB, 1 EC2 `t3.medium`, 1 RDS PostgreSQL Single-AZ `db.t3.medium`, EBS/S3/CloudWatch basico | 120 - 180 USD / mes | Bajo costo, baja complejidad, pero escala como una sola unidad y tiene menor aislamiento de fallos. |
| Arquitectura final microservicios | ALB, EKS, 3 EC2 workers, RDS Multi-AZ con read replicas, Redis HA, SQS, CloudWatch, Terraform state, NAT Gateway | 1.332,31 USD / mes | Mayor costo por disponibilidad, escalabilidad, separacion por dominio, failover y operacion distribuida. |

La diferencia de costo se justifica por el cambio de escenario: el sistema pasa de validar un MVP a sostener picos de ~210 RPS, 1.400 usuarios concurrentes, 38.000 productos, alto volumen de lecturas de catalogo y operaciones criticas de checkout/stock. En el monolito, escalar el catalogo obligaba a escalar toda la API; en la arquitectura final, cada dominio puede crecer de forma independiente.

## 7. Items de mayor costo y justificacion

| Item | Motivo del costo | Justificacion arquitectonica |
|---|---|---|
| RDS PostgreSQL | Multi-AZ y read replicas multiplican instancias facturables | Es el componente mas critico: protege datos transaccionales, mejora disponibilidad y separa carga de lectura/escritura segun Fase 3. |
| ElastiCache Redis | Dos nodos administrados siempre activos | Reduce carga sobre RDS, mejora latencia de catalogo/JWT/stock y habilita rate limiting atomico. |
| EKS + EC2 worker nodes | Control plane fijo + nodos EC2 24/7 | Permite orquestacion, HPA, despliegues por servicio y aislamiento operacional entre microservicios. |
| NAT Gateway | Costo fijo por hora mas procesamiento | Se usa para mantener nodos privados sin IP publica. Es util para seguridad, pero debe vigilarse porque puede crecer con trafico o multiples AZ. |
| CloudWatch | Logs por GB y metricas/alarmas | Es necesario para operar microservicios; sin limites de retencion puede crecer mucho. |

## 8. Estrategia de optimizacion

### Savings Plans

Aplicar Compute Savings Plans a los worker nodes EC2 cuando el uso base sea estable. En esta arquitectura, los 3 nodos productivos son candidatos porque se esperan 730 h/mes de ejecucion.

### Reserved Instances

Usar Reserved Instances o Database Savings Plans para RDS y ElastiCache cuando la arquitectura productiva este estable. RDS y Redis son servicios persistentes y representan los costos mas altos, por lo que los compromisos de 1 ano pueden reducir significativamente el gasto.

### Spot Instances

Usar Spot Instances solo para cargas tolerantes a interrupcion: workers secundarios, jobs batch, procesamiento asincronico no critico o ambientes no productivos. No conviene usarlas como unica capacidad para `order-service`, `payment-service` o componentes criticos de checkout.

### Auto Scaling

Mantener HPA y Cluster Autoscaler para que el costo compute crezca con la demanda real. La base de 3 nodos cubre disponibilidad inicial; el maximo debe limitarse para evitar costos inesperados durante picos o bugs de autoscaling.

### Apagar ambientes no productivos

QA, UAT/STAGING y DEV no deberian correr 730 h/mes salvo necesidad academica puntual. Se recomienda:

- Apagar nodos EKS no productivos fuera de horario.
- Usar RDS Single-AZ y tamanos pequenos en QA/UAT.
- Destruir ambientes efimeros con Terraform al cerrar la validacion.
- Usar Docker Compose local para desarrollo.

### Limitar logs de CloudWatch

Definir retencion por ambiente:

| Ambiente | Retencion sugerida |
|---|---|
| DEV/QA | 3 a 7 dias |
| UAT/STAGING | 7 a 14 dias |
| PROD | 30 dias para logs operativos; exportar historicos a S3 si hace falta |

Tambien conviene evitar logs `debug` en produccion, reducir payloads grandes y no loguear PII.

### Usar SQS en vez de MSK si aplica

Para el volumen del TFI, Amazon SQS es mas conveniente que Amazon MSK/Kafka administrado:

- No requiere brokers dedicados encendidos 24/7.
- Cobra por uso, con una capa gratuita relevante para cargas chicas.
- Reduce operacion, parches y monitoreo del broker.
- Encaja con el diseno de colas event-driven y DLQ.

MSK solo se justificaria si hubiera streaming de alto volumen, retencion prolongada, particionado avanzado o necesidades fuertes de Kafka API.

### Reducir NAT Gateway

El NAT Gateway esta justificado por subnets privadas, pero debe optimizarse:

- Usar VPC endpoints para S3, ECR, CloudWatch y SQS cuando sea viable.
- Evitar multiples NAT Gateways en ambientes no productivos.
- Revisar trafico procesado por NAT en Cost Explorer.

## 9. Riesgos y consideraciones

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Precios aproximados | La factura real puede diferir | Validar con AWS Pricing Calculator y Cost Explorer. |
| Trafico de datos no estimado | Data transfer puede aumentar el costo | Medir trafico real, usar CloudFront si aparece trafico publico alto y controlar cross-AZ. |
| Logs excesivos | CloudWatch puede crecer de forma silenciosa | Retencion por ambiente, niveles de log adecuados y filtros. |
| NAT Gateway sobredimensionado | Costo fijo relevante aun con poco trafico | VPC endpoints y apagado en no-prod. |
| RDS sobredimensionado | Es el componente mas caro | Monitorear CPU, conexiones, IOPS, cache hit ratio y ajustar replicas. |
| Redis sobredimensionado | Costo alto si cache hit es bajo | Medir hit ratio y memoria usada; bajar node type si corresponde. |
| EKS siempre activo | Control plane y nodos generan costo fijo | Consolidar workloads y apagar no-prod. |
| On-Demand puro | Costo mayor que compromisos | Pasar a Savings Plans/Reserved Instances cuando la carga sea estable. |
| Estimacion sin impuestos | No refleja impuestos, soporte o cargos de cuenta | Agregar esos rubros en presupuesto real. |

## 10. Fuentes de pricing

Las siguientes fuentes oficiales se usaron como referencia para la metodologia de costos. Los valores finales deben recalcularse en AWS Pricing Calculator antes de presupuestar o desplegar:

- [AWS Pricing Calculator](https://calculator.aws/)
- [Amazon EKS Pricing](https://aws.amazon.com/eks/pricing/)
- [Amazon EC2 On-Demand Pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Amazon EBS Volume Types - gp3](https://aws.amazon.com/ebs/volume-types/)
- [Amazon RDS Pricing](https://aws.amazon.com/rds/pricing/)
- [Amazon RDS for PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [Amazon ElastiCache Pricing](https://aws.amazon.com/elasticache/pricing/)
- [Amazon SQS Pricing](https://aws.amazon.com/sqs/pricing/)
- [Amazon API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
- [Elastic Load Balancing Pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [Amazon CloudWatch Pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [Amazon S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Amazon DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [Amazon VPC Pricing - NAT Gateway](https://aws.amazon.com/vpc/pricing/)

## 11. Conclusion

La arquitectura final cuesta aproximadamente **1.332,31 USD/mes** en modalidad On-Demand para produccion. El costo es considerablemente mayor que el monolito inicial, pero esta diferencia esta alineada con los objetivos de la evolucion arquitectonica del TFI: alta disponibilidad, escalabilidad horizontal, separacion por dominio, tolerancia a fallos, observabilidad y operacion reproducible mediante Terraform.

Para una implementacion real, la primera optimizacion no deberia ser eliminar componentes criticos, sino validar metricas y aplicar descuentos: Savings Plans para compute, Reserved Instances para RDS/ElastiCache, apagado de no-productivos, retencion controlada de logs y uso de SQS en lugar de brokers administrados mas costosos como MSK.

