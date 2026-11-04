# Handoff — código Colpa Bélgica Conecta

## Estado (2026-11-03)
- Plan aprobado: [plan-puesta-en-marcha.md](plan-puesta-en-marcha.md). Meta: demo del 30% ≈ 1-dic-2026 (núcleo 13 RF: RF-01..10, 11, 15, 16).
- Fuente de requisitos: `../Documentos para mi proyecto de titulacion/Documento PG - Trabajo/fuente/03-cap2a..d.md`.
- **Fase 0 (PR feat/fase-0-cimientos):** monorepo pnpm, Expo SDK 58 / RN 0.88, Express 5, Prisma 7.10 + Postgres 17, zod 4, Jest 30, CI GitHub Actions. Schema con las 10 entidades del diccionario (Tablas 2.53–2.63) + CHECK tipo↔módulo. Seed demo idempotente con prefijo [FICTICIO], bloqueado en producción.
- **Progreso real: 0/35 RF** (`pnpm progreso`): solo cuentan tests de `apps/*` con RF en el nombre y sin fallos. Los tests de dominio de `packages/shared` no son evidencia de RF.

## Decisiones
- La ficha de `publicacion` usa las columnas explícitas del diccionario de datos (Tabla 2.55), no `detalle Json`: fidelidad a la tesis. zod valida por tipo.
- Un solo `.env` en la raíz (+ `.env.test`); los tests se niegan a correr si la BD no termina en `_test`.
- TypeScript 6.0 (7.x aún no soportado por typescript-eslint/ts-jest). Prisma 7 estable (8 es rc).

## Pendiente
- CTO: elegir diseño (propuesta A / B / mezcla; recomendado B con paleta de A). Artifacts: A https://claude.ai/artifact/Bv2TKwt2ehqLGNDbAfquqT · B https://claude.ai/artifact/FCJSXpVdUBu4yxcHFn3o5K
- CTO: `railway login` y `eas login` (entorno de pruebas y development build Android).
- Fase 2: auth (RF-01..03), ficha + vacunación (RF-04, 11), imágenes (RF-05), `transicionar` (RF-06..09), auditoría (RF-10).
- Puerto 5432 ocupado en esta máquina: usar `DB_PORT=5440` en `.env`.
