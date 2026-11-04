# Colpa Bélgica Conecta

Monorepo pnpm: `apps/api` (Express 5 + Prisma + PostgreSQL), `apps/mobile` (Expo + Expo Router), `packages/shared` (zod, dominio y catálogo).

## Puesta en marcha

Requisitos: Node 24, pnpm 11, Docker.

```bash
cp .env.example .env            # único .env, en la raíz: la API, prisma y el seed lo leen de ahí
cp .env.test.example .env.test  # base colpa_test, solo para pruebas (los tests abortan si la base no termina en _test)
pnpm install
pnpm db:up                      # Postgres 17 (crea colpa y colpa_test)
pnpm --filter api exec prisma migrate dev
pnpm --filter api exec prisma db seed
pnpm --filter api dev           # GET http://localhost:3000/api/v1/health
pnpm --filter mobile start      # Expo
```

Si el puerto 5432 está ocupado, define `DB_PORT` en `.env` y ajusta el puerto en `DATABASE_URL`.

## Comandos

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (la API prueba contra Postgres real: requiere `pnpm db:up`).
- `pnpm progreso`: corre los tests y escribe `docs/progreso.md` (RF con test verde / 35). Los tests de `apps/*` llevan su RF en el nombre, p. ej. `describe('RF-07 …')`; un RF cuenta solo con ≥1 test verde y ninguno fallido (`packages/*` nunca es evidencia).
- `node scripts/extraer-requisitos.mjs`: regenera `docs/requisitos.json` desde el Documento PG.
