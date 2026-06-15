---
title: "Índice de Documentación Técnica — TFI"
tags: [indice, tfi, documentacion]
---

# Documentación Técnica — TFI Desarrollo Web

Índice de la carpeta `docs/`. Cada documento cubre una fase del TFI y mapea a sus issues en el tablero del proyecto.

---

## Índice de documentos

| Documento | Fase TFI | Issues | Estado |
|-----------|----------|--------|--------|
| [[01-modelo-negocio]] | Fase 1 — Temática y Modelo de Negocio | #1 | ✅ Completo |
| [[02-arquitectura-inicial]] | Fase 1 — Arquitectura Monolítica (Canónico) | #2, #3 | ✅ Completo |
| [[06-microservicios-tradicionales]] | Fase 2A — Microservicios REST Síncrono | #5, #6 | ✅ Completo |
| [[07-microservicios-event-driven]] | Fase 2B — Microservicios Event-Driven | #7, #8 | ✅ Completo |
| [[10-cache-alta-disponibilidad]] | Fase 3 — Caché y Alta Disponibilidad | #10 | ✅ Completo |
| `11-read-replicas` | Fase 3 — Read Replicas | #11 | 🔄 Pendiente |
| [[12-balanceadores-autoscaling]] | Fase 3 — Balanceadores y Auto-scaling | #12 | ✅ Completo |
| `13-ambientes-devops` | Fase 4 — Ambientes, CI/CD, Kubernetes, Terraform | #13–#17 | 🔄 Pendiente |
| `18-costos-infraestructura` | Fase 4 — Estimación de costos en la nube | #18 | 🔄 Pendiente |
| `19-integracion-ia` | Fase 5 — Integración con IA (LLM / RAG) | #19, #20 | 🔄 Pendiente |
| [[00-reporte-esqueleto]] | Artefacto — Esqueleto de microservicios | #4, #9 | ✅ Completo |

---

## Estado por fase

| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Temática, modelo de negocio y arquitectura monolítica | ✅ Documentada |
| Fase 2A | Microservicios tradicionales (REST síncrono) | ✅ Documentada |
| Fase 2B | Microservicios modernos (event-driven con AWS SQS/SNS) | ✅ Documentada |
| Fase 3 | Caché (Redis) documentada; read replicas y balanceadores pendientes | 🔄 Parcial |
| Fase 4 | Infraestructura, DevOps, ambientes, IaC, costos | 🔄 Pendiente |
| Fase 5 | Integración con IA (LLM o RAG) | 🔄 Pendiente |

---

## Convención de numeración

Los documentos siguen el esquema `NN-nombre-del-tema.md` donde `NN` es el número del issue principal que cubre. El prefijo `00` se reserva para reportes de artefactos técnicos (esqueletos, commits).

Documentos futuros deben seguir este mismo esquema y registrarse en este índice antes de commitearse.

---

## Imágenes y recursos

| Archivo | Descripción | Referenciado en |
|---------|-------------|-----------------|
| `diagrama_monolito_tfi.png` | Diagrama de arquitectura inicial (Fase 1) | [[02-arquitectura-inicial]] |
| `historial_commits_esqueleto.png` | Captura del historial de commits del esqueleto | [[00-reporte-esqueleto]] |
