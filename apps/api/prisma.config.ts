import './src/env';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // process.env (no env()): `prisma generate` en Vercel Preview corre sin DATABASE_URL y env() lanzaría.
  datasource: { url: process.env['DATABASE_URL'] },
});
